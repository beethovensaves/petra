import { readFileSync } from "node:fs";

import type { PetraProjectDefinition } from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  FocusedGraphEntryLink,
  createFocusedGraphAnalysisRequestId,
  createFocusedGraphRequestId,
  focusedGraphDefinitionRef,
  focusedGraphEntryFromSearch,
  focusedGraphEntryPath,
  scientificFocusedGraphEntryDraft,
  type FocusedGraphEntry,
  type FocusedGraphEntryOriginKind,
} from "./focused-graph-entry.js";
import {
  focusedGraphAnalysisRequestFromEntry,
  focusedGraphRequestFromEntry,
} from "./project-data.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const claimRef = {
  record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
  revision: 3,
  record_hash: `sha256:${"a".repeat(64)}`,
};
const definitionRef = {
  project_definition_id: "project_definition_01K4C000000000000000000001",
  revision: 2,
  content_hash: `sha256:${"b".repeat(64)}`,
  definition_family: "petra.scientific-evidence",
};

const entryFor = (
  originKind: FocusedGraphEntryOriginKind,
): FocusedGraphEntry => {
  const draft = scientificFocusedGraphEntryDraft({
    projectId,
    question: "Which recorded relationships concern this Claim?",
    focusRef: claimRef,
    originKind,
    definitionRef,
    returnDestinationKind:
      originKind === "review"
        ? "review"
        : originKind === "history"
          ? "history"
          : originKind === "brief"
            ? "brief"
            : "evidence",
    returnDestinationOwner:
      originKind === "review"
        ? "project_review_view"
        : originKind === "history"
          ? "project_history_episode_view"
          : originKind === "brief"
            ? "project_brief_view"
            : "project_relationship_view",
    returnLabel: originKind.replaceAll("_", " "),
    returnFocusId: "origin-control",
    ...(originKind === "saved_question"
      ? {
          expectedSnapshot: {
            snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAC",
            revision: 1,
            event_position: 12,
            content_hash: `sha256:${"c".repeat(64)}`,
          },
        }
      : {}),
  });
  return {
    ...draft,
    request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
    return_context: {
      ...draft.return_context,
      path: `/projects/${projectId}/${
        originKind === "review"
          ? "review/review_session_01ARZ3NDEKTSV4RRFFQ69G5FAD"
          : originKind === "history"
            ? "history/event_01ARZ3NDEKTSV4RRFFQ69G5FAE"
            : originKind === "petra"
              ? "petra?communication=exact"
              : "brief"
      }#origin-control`,
    },
  };
};

const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

describe("focused graph bounded entry and orientation contract", () => {
  it("round-trips Brief, Review, Petra, History, saved-question, and direct entry without ambient scope", () => {
    const origins: FocusedGraphEntryOriginKind[] = [
      "brief",
      "review",
      "petra",
      "history",
      "saved_question",
      "direct",
    ];
    for (const origin of origins) {
      const entry = entryFor(origin);
      const path = focusedGraphEntryPath(entry);
      const url = new URL(path, "https://petra.local");
      const parsed = focusedGraphEntryFromSearch(projectId, url.searchParams);
      expect(parsed).toEqual(entry);
      expect(url.searchParams.has("layout")).toBe(false);
      expect(url.searchParams.has("command")).toBe(false);
      expect(url.searchParams.has("corpus")).toBe(false);
    }
    expect(createFocusedGraphRequestId()).toMatch(
      /^focused_graph_request_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
  });

  it("retains the exact contextual route and focus target in the return recipe", () => {
    const entry = entryFor("brief");
    const {
      request_id: requestId,
      return_context: returnContext,
      ...draft
    } = entry;
    expect(requestId).toMatch(/^focused_graph_request_/u);
    expect(returnContext.focus_id).toBe("origin-control");
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[`/projects/${projectId}/brief?result=exact`]}
      >
        <FocusedGraphEntryLink
          entry={{
            ...draft,
            return_context: {
              label: "Brief result",
              focus_id: "brief-result-0",
            },
          }}
        >
          Open Graph
        </FocusedGraphEntryLink>
      </MemoryRouter>,
    );
    expect(markup).toContain("Open Graph");
    expect(markup).toContain(
      "returnPath=%2Fprojects%2Fproject_01ARZ3NDEKTSV4RRFFQ69G5FAW%2Fbrief%3Fresult%3Dexact%23brief-result-0",
    );
    expect(markup).toContain("returnFocus=brief-result-0");
  });

  it("round-trips exact Review and inquiry-result action-preview targets without renderer state", () => {
    const correction = {
      ...entryFor("review"),
      action_preview_target: {
        action_kind: "governed_correction" as const,
        requested_change: "edit_relationship" as const,
        review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAH",
        review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAJ",
      },
    };
    const work = {
      ...entryFor("brief"),
      action_preview_target: {
        action_kind: "new_work" as const,
        inquiry_result_link_ref: {
          project_inquiry_link_id:
            "project_inquiry_link_01ARZ3NDEKTSV4RRFFQ69G5FAK",
          content_hash: `sha256:${"d".repeat(64)}`,
          record_hash: `sha256:${"e".repeat(64)}`,
        },
      },
    };

    for (const entry of [correction, work]) {
      const url = new URL(focusedGraphEntryPath(entry), "https://petra.local");
      expect(focusedGraphEntryFromSearch(projectId, url.searchParams)).toEqual(
        entry,
      );
      expect(url.searchParams.has("coordinates")).toBe(false);
      expect(url.searchParams.has("layout")).toBe(false);
      expect(url.searchParams.has("gesture")).toBe(false);
    }
  });

  it("fails closed on extra fields, cross-Project return, or a contextual origin without its exact selected object", () => {
    const entry = entryFor("review");
    const url = new URL(focusedGraphEntryPath(entry), "https://petra.local");
    url.searchParams.set("layout", "force");
    expect(() =>
      focusedGraphEntryFromSearch(projectId, url.searchParams),
    ).toThrow(/missing, duplicate, or unsupported/u);

    expect(() =>
      focusedGraphEntryPath({
        ...entry,
        return_context: {
          ...entry.return_context,
          path: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/brief",
        },
      }),
    ).toThrow(/exact Project/u);

    expect(() =>
      focusedGraphEntryPath({
        ...entry,
        origin: { origin_kind: "review" },
      }),
    ).toThrow(/exact originating object/u);
  });

  it("binds the entry to the exact immutable definition and sends no return route or renderer state to the typed query", async () => {
    const definition = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-definition-scientific.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectDefinition;
    definition.content_hash = await hash(definition.content);
    const entry = {
      ...entryFor("brief"),
      project_id: definition.project_id,
      project_definition_ref: focusedGraphDefinitionRef(definition),
      return_context: {
        label: "Brief result",
        path: `/projects/${definition.project_id}/brief#brief-result-0`,
        focus_id: "brief-result-0",
      },
    };
    const request = await focusedGraphRequestFromEntry(entry, definition);

    expect(request.project_definition_ref).toMatchObject({
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    });
    expect(request.project_definition_ref.record_hash).toBe(
      await hash(definition),
    );
    expect(request.origin).toEqual(entry.origin);
    expect(request.focus_ref).toEqual(entry.focus_ref);
    expect(request.limits).toEqual(entry.limits);
    expect(request.semantic_layer).toBe("current");
    expect(request.temporal_position).toEqual({
      position_kind: "current",
      dimension: "project_snapshot",
    });
    expect(request).not.toHaveProperty("return_context");
    expect(request).not.toHaveProperty("layout");
    expect(request).not.toHaveProperty("command");
  });

  it("binds Working changes and exact Historical positions to distinct server reads", async () => {
    const definition = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-definition-scientific.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectDefinition;
    definition.content_hash = await hash(definition.content);
    const historicalPosition = {
      snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAC",
        revision: 1,
        event_position: 12,
        content_hash: `sha256:${"c".repeat(64)}`,
      },
      temporal_position: {
        position_kind: "historical" as const,
        dimension: "recorded_time" as const,
        at: {
          state: "exact" as const,
          value: "2026-09-15T20:00:00.000Z",
        },
      },
    };
    const base = {
      ...entryFor("history"),
      project_id: definition.project_id,
      project_definition_ref: focusedGraphDefinitionRef(definition),
      historical_position: historicalPosition,
      return_context: {
        label: "History event",
        path: `/projects/${definition.project_id}/history/event_01ARZ3NDEKTSV4RRFFQ69G5FAE#origin-control`,
        focus_id: "origin-control",
      },
    };
    const working = await focusedGraphRequestFromEntry(
      { ...base, semantic_layer: "working" },
      definition,
    );
    const historicalEntry = {
      ...base,
      semantic_layer: "historical" as const,
    };
    const historical = await focusedGraphRequestFromEntry(
      historicalEntry,
      definition,
    );

    expect(working.semantic_layer).toBe("working");
    expect(working.temporal_position.position_kind).toBe("current");
    expect(historical.semantic_layer).toBe("historical");
    expect(historical.temporal_position).toEqual(
      historicalPosition.temporal_position,
    );
    expect(historical.expected_snapshot).toEqual(historicalPosition.snapshot);

    const path = focusedGraphEntryPath(historicalEntry);
    const parsed = focusedGraphEntryFromSearch(
      definition.project_id,
      new URL(path, "https://petra.local").searchParams,
    );
    expect(parsed).toEqual(historicalEntry);
    expect(path).toContain("semanticLayer=historical");
    expect(path).toContain("historicalRecordedAt=2026-09-15T20%3A00%3A00.000Z");
  });

  it("rejects Historical or comparison entry state without its exact boundary", () => {
    expect(() =>
      focusedGraphEntryPath({
        ...entryFor("history"),
        semantic_layer: "historical",
      }),
    ).toThrow(/incomplete or incompatible/u);
    expect(() =>
      focusedGraphEntryPath({
        ...entryFor("history"),
        semantic_layer: "historical",
        presentation: "current_working_comparison",
        historical_position: {
          snapshot: {
            snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAC",
            revision: 1,
            event_position: 12,
            content_hash: `sha256:${"c".repeat(64)}`,
          },
          temporal_position: {
            position_kind: "historical",
            dimension: "recorded_time",
            at: { state: "exact", value: "2026-09-15T20:00:00.000Z" },
          },
        },
      }),
    ).toThrow(/incomplete or incompatible/u);
  });

  it("round-trips dedicated comparison, impact, and time task identity without renderer authority", () => {
    const analysisRequestId =
      "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY";
    const analyses = [
      {
        presentation: "current_working_comparison" as const,
        analysis: {
          analysis_request_id: analysisRequestId,
          analysis_kind: "comparison" as const,
        },
      },
      {
        presentation: "impact" as const,
        analysis: {
          analysis_request_id: analysisRequestId,
          analysis_kind: "impact" as const,
          history_event_id: "event_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
          review_binding: {
            review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAW",
            review_member_ids: [
              "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAX",
            ] as const,
          },
        },
      },
      {
        presentation: "time" as const,
        analysis: {
          analysis_request_id: analysisRequestId,
          analysis_kind: "time" as const,
          temporal_dimension: "recorded_time" as const,
        },
      },
    ];
    for (const task of analyses) {
      const entry = { ...entryFor("history"), ...task };
      const url = new URL(focusedGraphEntryPath(entry), "https://petra.local");
      expect(focusedGraphEntryFromSearch(projectId, url.searchParams)).toEqual(
        entry,
      );
      expect(url.searchParams.has("layout")).toBe(false);
      expect(url.searchParams.has("coordinates")).toBe(false);
      expect(url.searchParams.has("importance")).toBe(false);
    }
    expect(createFocusedGraphAnalysisRequestId()).toMatch(
      /^focused_graph_analysis_request_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
  });

  it("maps exact entry state to typed analysis requests with stable snapshots and no derived scores", async () => {
    const definition = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/project-definition-scientific.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraProjectDefinition;
    definition.content_hash = await hash(definition.content);
    const snapshot = {
      snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAC",
      revision: 1,
      event_position: 12,
      content_hash: `sha256:${"c".repeat(64)}`,
    };
    const base = {
      ...entryFor("history"),
      project_id: definition.project_id,
      project_definition_ref: focusedGraphDefinitionRef(definition),
      expected_snapshot: snapshot,
      return_context: {
        label: "History event",
        path: `/projects/${definition.project_id}/history/event_01ARZ3NDEKTSV4RRFFQ69G5FAZ#origin-control`,
        focus_id: "origin-control",
      },
    };
    const comparison = await focusedGraphAnalysisRequestFromEntry(
      {
        ...base,
        presentation: "current_working_comparison",
        analysis: {
          analysis_request_id:
            "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
          analysis_kind: "comparison",
        },
      },
      definition,
      snapshot,
      {
        primary: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAB",
        secondary: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAC",
      },
    );
    expect(comparison).toMatchObject({
      task_kind: "comparison",
      before: {
        position_key: "position:current",
        graph_request: { semantic_layer: "current" },
      },
      after: {
        position_key: "position:working",
        graph_request: { semantic_layer: "working" },
      },
    });
    if (comparison.task_kind !== "comparison") {
      throw new Error("Expected comparison request.");
    }
    expect(comparison.before.graph_request.expected_snapshot).toEqual(snapshot);
    expect(comparison.after.graph_request.expected_snapshot).toEqual(snapshot);
    expect(comparison).not.toHaveProperty("layout");
    expect(comparison).not.toHaveProperty("importance");

    const impact = await focusedGraphAnalysisRequestFromEntry(
      {
        ...base,
        presentation: "impact",
        analysis: {
          analysis_request_id:
            "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
          analysis_kind: "impact",
          history_event_id: "event_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
        },
      },
      definition,
      snapshot,
      { primary: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAD" },
    );
    expect(impact).toMatchObject({
      task_kind: "impact",
      history_event_id: "event_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
      position: { graph_request: { expected_snapshot: snapshot } },
    });

    const time = await focusedGraphAnalysisRequestFromEntry(
      {
        ...base,
        presentation: "time",
        analysis: {
          analysis_request_id:
            "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
          analysis_kind: "time",
          temporal_dimension: "publication_time",
        },
      },
      definition,
      snapshot,
      { primary: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAE" },
    );
    expect(time).toMatchObject({
      task_kind: "time",
      temporal_dimension: "publication_time",
      position: { graph_request: { expected_snapshot: snapshot } },
    });
  });
});
