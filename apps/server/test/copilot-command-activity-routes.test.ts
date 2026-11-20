import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { PetraCopilotCommandActivity } from "@petra/contracts";
import {
  copilotCommandPreview,
  copilotHash,
  type CopilotContext,
  type OwnedCopilotCommandProposal,
} from "@petra/core";
import { mountCopilotCommandActivityRoutes } from "../src/copilot-command-activity-routes.js";
import { createPetraApp } from "../src/app.js";

const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
const harness = () => {
  const activity = fixture<PetraCopilotCommandActivity>(
    "copilot-command-activity",
  );
  const context = fixture<CopilotContext>("copilot-context");
  const { content_hash: ignored, ...body } = context;
  void ignored;
  context.content_hash = copilotHash(body);
  const request = activity.commands[0]!.preview.payload;
  const command = copilotCommandPreview({
    operation_id: "work.start",
    context,
    target_id: activity.work_unit_ref.work_unit_id,
    request,
  });
  const proposal: OwnedCopilotCommandProposal = {
    proposal_id: activity.proposal_id,
    actor_id: activity.actor_id,
    origin: activity.origin,
    input: {
      project_id: context.project_id,
      context,
      question: activity.origin.question,
      previews: [command.preview],
    },
    commands: [command],
    work_unit_ref: activity.work_unit_ref,
    interaction_run_ref: activity.interaction_run_ref,
    state: "completed",
    output: activity.output!,
    output_hash: copilotHash(activity.output),
  };
  const list = vi.fn(() =>
    Promise.resolve<readonly OwnedCopilotCommandProposal[]>([proposal]),
  );
  const access = vi.fn(() => Promise.resolve());
  const app = new Hono();
  mountCopilotCommandActivityRoutes(
    app,
    { listActivities: list },
    { actorId: activity.actor_id, assertAccess: access },
  );
  const read = () =>
    app.request(
      `/api/projects/${context.project_id}/copilot/activities/${activity.origin.protocol_run_id}`,
    );
  return { app, list, access, proposal, read };
};
describe("canonical proposed-activity read boundary", () => {
  it("execution: releases exact typed origin Work and Run attachment without substituting private input or advisory content", async () => {
    const h = harness(),
      response = await h.read();
    expect(response.status).toBe(200);
    const value = (await response.json()) as {
      activities: PetraCopilotCommandActivity[];
    };
    expect(value.activities[0]?.origin).toEqual(h.proposal.origin);
    expect(value.activities[0]?.work_unit_ref).toEqual(
      h.proposal.work_unit_ref,
    );
    expect(value.activities[0]?.interaction_run_ref).toEqual(
      h.proposal.interaction_run_ref,
    );
    expect(value.activities[0]?.output).toEqual(h.proposal.output);
    expect(value.activities[0]).not.toHaveProperty("input");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(h.access).toHaveBeenCalledTimes(2);
  });
  it("critical: foreign attachments and malformed output release no proposal bytes", async () => {
    for (const field of ["origin", "output_hash", "input"] as const) {
      const h = harness();
      if (field === "origin")
        h.list.mockResolvedValueOnce([
          {
            ...h.proposal,
            origin: {
              ...h.proposal.origin,
              project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAX",
            },
          },
        ]);
      else if (field === "output_hash")
        h.list.mockResolvedValueOnce([
          { ...h.proposal, output_hash: `sha256:${"f".repeat(64)}` },
        ]);
      else
        h.list.mockResolvedValueOnce([
          {
            ...h.proposal,
            input: {
              ...h.proposal.input,
              question: "A rebound question absent from the canonical origin.",
            },
          },
        ]);
      const response = await h.read();
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("proposed_only");
    }
  });
  it("critical: revoked access after the private read and bearer denial before the route release no attachments", async () => {
    const h = harness();
    h.access.mockRejectedValueOnce(new Error("permission revoked"));
    expect((await h.read()).status).toBe(503);
    expect(h.list).not.toHaveBeenCalled();
    h.access
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("permission revoked during read"));
    const response = await h.read();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("proposed_only");
    const actual = createPetraApp({ authToken: "synthetic-route-token" });
    const denied = await actual.app.request(
      `/api/projects/${h.proposal.origin.project_id}/copilot/activities/${h.proposal.origin.protocol_run_id}`,
    );
    expect(denied.status).toBe(401);
  });
});
