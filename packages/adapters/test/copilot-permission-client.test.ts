import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import type {
  PetraCopilotAuthorityRequest,
  PetraCopilotAuthorityReceipt,
} from "@petra/contracts";
import { copilotHash } from "@petra/core";
import { ProjectCopilotClient } from "../src/project-copilot-ag-ui.js";
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
describe("Exact conversation permission client", () => {
  const request = fixture<PetraCopilotAuthorityRequest>(
      "copilot-authority-request",
    ),
    receipt = fixture<PetraCopilotAuthorityReceipt>(
      "copilot-authority-receipt",
    );
  it("submits only the exact explicit permission request and accepts its retained receipt", async () => {
    const requests: { url: string; body: unknown }[] = [];
    const client = new ProjectCopilotClient({
      baseUrl: "https://petra.test",
      token: "known-fixture-token",
      fetch: (input, init) => {
        requests.push({
          url:
            input instanceof URL
              ? input.href
              : typeof input === "string"
                ? input
                : input.url,
          body: JSON.parse(
            typeof init?.body === "string" ? init.body : "null",
          ) as unknown,
        });
        return Promise.resolve(
          new Response(JSON.stringify(receipt), { status: 200 }),
        );
      },
    });
    expect(await client.authorize(request.project_id, request)).toEqual(
      receipt,
    );
    expect(requests).toEqual([
      {
        url: `https://petra.test/api/projects/${request.project_id}/copilot/authorize`,
        body: request,
      },
    ]);
  });
  it("denies rehashed receipt substitutions and widened authority before claiming permission", async () => {
    for (const mutate of [
      (value: PetraCopilotAuthorityReceipt) => {
        value.content.grant.content.allowed_commands = ["ManageProjectWork"];
      },
      (value: PetraCopilotAuthorityReceipt) => {
        value.content.proposal.project_id =
          "project_01K4E000000000000000000099";
      },
      (value: PetraCopilotAuthorityReceipt) => {
        value.content.grant.grantee.actor_id =
          "actor_01K4E000000000000000000099";
      },
      (value: PetraCopilotAuthorityReceipt) => {
        value.content.command_id = "command_01K4E000000000000000000099";
      },
    ]) {
      const changed = structuredClone(receipt);
      mutate(changed);
      changed.content.grant.content_hash = copilotHash(
        changed.content.grant.content,
      );
      changed.content_hash = copilotHash(changed.content);
      const client = new ProjectCopilotClient({
        baseUrl: "https://petra.test",
        token: "known-fixture-token",
        fetch: () =>
          Promise.resolve(
            new Response(JSON.stringify(changed), { status: 200 }),
          ),
      });
      await expect(
        client.authorize(request.project_id, request),
      ).rejects.toThrow(/reviewed owner proposal/u);
    }
  });
});
