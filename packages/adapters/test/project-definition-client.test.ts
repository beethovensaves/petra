import { readFileSync } from "node:fs";
import type { PetraProjectDefinition } from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";
import { ProjectDefinitionClient } from "../src/project-definition-client.js";
const fixture = (): PetraProjectDefinition =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/project-definition-controlled-writing.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
const binding = (d: PetraProjectDefinition) => ({
  projectId: d.project_id,
  definitionId: d.project_definition_id,
  revision: d.revision,
  contentHash: d.content_hash,
});
describe("exact ProjectDefinition client", () => {
  it("requests one authenticated retained revision and verifies its canonical bytes", async () => {
    const d = fixture();
    const transport = vi.fn(() => Promise.resolve(Response.json(d)));
    const client = new ProjectDefinitionClient({
      baseUrl: "http://petra.test",
      token: "definition-reader",
      fetch: transport,
    });
    expect(await client.read(binding(d))).toEqual(d);
    const [url, init] = transport.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.href).toBe(
      `http://petra.test/api/queries/projects/${d.project_id}/definition?definition_revision=1`,
    );
    expect(init.headers).toEqual({ authorization: "Bearer definition-reader" });
  });
  it("rejects foreign identity stale revision and rehashed or unhashed substitution without template fallback", async () => {
    const d = fixture();
    for (const change of [
      { project_id: "project_01K6P000000000000000000999" },
      { revision: 2 },
      {
        project_definition_id: "project_definition_01K6P000000000000000000999",
      },
      { content_hash: `sha256:${"0".repeat(64)}` },
      { content: { ...d.content, label: "Substituted meaning" } },
    ]) {
      const client = new ProjectDefinitionClient({
        baseUrl: "http://petra.test",
        token: "definition-reader",
        fetch: () => Promise.resolve(Response.json({ ...d, ...change })),
      });
      await expect(client.read(binding(d))).rejects.toThrow(
        "changed the requested",
      );
    }
    const transport = vi.fn(() =>
      Promise.resolve(Response.json({ error: {} }, { status: 404 })),
    );
    const client = new ProjectDefinitionClient({
      baseUrl: "http://petra.test",
      token: "definition-reader",
      fetch: transport,
    });
    await expect(client.read(binding(d))).rejects.toThrow("unavailable (404)");
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
