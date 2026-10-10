import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { mountWorkingPlanReadiness } from "../src/copilot-working-plan-routes.js";
import type { ProjectCopilotService } from "../src/project-copilot.js";
import type { WorkingPlanDeployment } from "../src/copilot-working-plan-model.js";
const project = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
describe("working-structure readiness remains a scoped read", () => {
  it("returns its exact role and context while leaving invocation to the canonical owner", async () => {
    const app = new Hono();
    const read = vi.fn(() =>
      Promise.resolve({
        context: { content_hash: `sha256:${"1".repeat(64)}` },
      }),
    );
    const invoke = vi.fn();
    const service = { read } as unknown as ProjectCopilotService;
    const deployment = {
      state: "ready",
      model: { invokeWorkingPlan: invoke },
      certification: {
        role: "petra.copilot-working-plan@1.0.0",
        provider_model: "contract-model",
        profile_hash: `sha256:${"2".repeat(64)}`,
        output_schema_hash: `sha256:${"3".repeat(64)}`,
      },
    } as unknown as WorkingPlanDeployment;
    mountWorkingPlanReadiness(app, service, deployment);
    const response = await app.request(
      `/api/projects/${project}/copilot/working-plan`,
    );
    const body = (await response.json()) as {
      project_id: string;
      authority: string;
      invocation: { state: string };
      availability: { state: string };
    };
    expect(response.status).toBe(200);
    expect(body.project_id).toBe(project);
    expect(body.authority).toBe("proposed_only");
    expect(body.availability.state).toBe("ready");
    expect(body.invocation.state).toBe("owner_required");
    expect(read).toHaveBeenCalledWith(project, []);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("does not disclose a role or substitute a Project when the exact read fails", async () => {
    const app = new Hono();
    const read = vi.fn(() =>
      Promise.reject(new Error("restricted private descriptor")),
    );
    mountWorkingPlanReadiness(app, {
      read,
    } as unknown as ProjectCopilotService);
    const response = await app.request(
      `/api/projects/${project}/copilot/working-plan`,
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(
      "restricted private descriptor",
    );
    expect(read).toHaveBeenCalledTimes(1);
    const malformed = await app.request(
      "/api/projects/not-a-project/copilot/working-plan",
    );
    expect(malformed.status).toBe(400);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
