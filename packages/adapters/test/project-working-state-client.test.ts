import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProjectWorkingStateSnapshot,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import { ProjectWorkingStateClient } from "../src/project-working-state-client.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const snapshotFixture = (): PetraProjectWorkingStateSnapshot => {
  const modelCandidate =
    readFixture<PetraWorkingCandidate>("working-candidate");
  const humanCandidate = readFixture<PetraWorkingCandidate>(
    "working-candidate-correction",
  );
  humanCandidate.working_candidate_id =
    "working_candidate_01K4D000000000000000000012";
  humanCandidate.revision = 1;
  humanCandidate.lineage = { lineage_kind: "root" };
  const projection = structuredClone(humanCandidate) as Record<string, unknown>;
  delete projection.content_hash;
  humanCandidate.content_hash = hash(projection);
  const relationship = readFixture<PetraWorkingRelationship>(
    "working-relationship",
  );
  const content: PetraProjectWorkingStateSnapshot["content"] = {
    project_definition_ref: modelCandidate.project_definition_ref,
    authority: {
      isolation: "repeatable_read",
      event_position: 42,
      stream_revision: 7,
    },
    selection_boundary: {
      selection_kind: "current_working_heads",
      historical_working_revisions_included: false,
      authoritative_records_included: false,
      graph_overlay_composed: false,
    },
    candidates: [modelCandidate, humanCandidate],
    relationships: [relationship],
  };
  return {
    schema_name: "petra.project-working-state-snapshot",
    schema_version: "1.0.0",
    project_id: modelCandidate.project_id,
    content,
    content_hash: hash(content),
    read_at: "2026-09-13T14:10:00.000Z",
  };
};

describe("Project working-state client", () => {
  it("uses one authenticated exact read for direct and model-mediated callers without collapsing producer provenance", async () => {
    const fixture = snapshotFixture();
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(fixture)));
    const client = new ProjectWorkingStateClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: transport,
    });

    const direct = await client.read(fixture.project_id);
    const modelMediated = await client.read(fixture.project_id);
    expect(direct).toEqual(modelMediated);
    expect(
      direct.content.candidates.map((record) => ({
        id: record.working_candidate_id,
        producer: record.producer.producer_kind,
      })),
    ).toEqual([
      {
        id: fixture.content.candidates[0]!.working_candidate_id,
        producer: "model",
      },
      {
        id: fixture.content.candidates[1]!.working_candidate_id,
        producer: "human",
      },
    ]);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0]?.[1]).toEqual({
      method: "GET",
      headers: { authorization: "Bearer token" },
    });
    expect((transport.mock.calls[0]?.[0] as URL).pathname).toBe(
      `/api/queries/projects/${fixture.project_id}/working-state`,
    );
  });

  it("rejects invalid input, transport failure, lost nested integrity, cross-Project content, and duplicate current identities", async () => {
    const fixture = snapshotFixture();
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(fixture)));
    const client = new ProjectWorkingStateClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: transport,
    });
    await expect(client.read("project-not-canonical")).rejects.toThrow(
      TypeError,
    );
    expect(transport).not.toHaveBeenCalled();

    transport.mockImplementationOnce(() =>
      Promise.resolve(
        Response.json({ error: "unauthorized" }, { status: 401 }),
      ),
    );
    await expect(client.read(fixture.project_id)).rejects.toMatchObject({
      status: 401,
    });

    const lostProvenance = structuredClone(fixture);
    lostProvenance.content.candidates[0]!.provenance[0].statement =
      "Changed provenance outside the retained working-record content hash.";
    lostProvenance.content_hash = hash(lostProvenance.content);
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(lostProvenance)),
    );
    await expect(client.read(fixture.project_id)).rejects.toMatchObject({
      status: 200,
    });

    const crossProject = structuredClone(fixture);
    crossProject.content.candidates[0]!.project_id =
      "project_01K4E000000000000000000001";
    crossProject.content_hash = hash(crossProject.content);
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(crossProject)),
    );
    await expect(client.read(fixture.project_id)).rejects.toMatchObject({
      status: 200,
    });

    const duplicate = structuredClone(fixture);
    duplicate.content.candidates.push(
      structuredClone(duplicate.content.candidates[0]!),
    );
    duplicate.content_hash = hash(duplicate.content);
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(duplicate)),
    );
    await expect(client.read(fixture.project_id)).rejects.toMatchObject({
      status: 200,
    });
  });
});
