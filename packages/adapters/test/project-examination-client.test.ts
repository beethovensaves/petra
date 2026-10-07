import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type {
  PetraHypothesis,
  PetraProjectExaminationReceipt,
  PetraProjectExaminationView,
} from "@petra/contracts";
import {
  ProjectExaminationClient,
  examinationContentHash,
  examinationReference,
  ExaminationRequestRejected,
} from "../src/project-examination-client.js";

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
const seal = async <T extends { content: unknown; content_hash: string }>(
  record: T,
): Promise<T> => {
  record.content_hash = await examinationContentHash(record.content);
  return record;
};
const basis = async () => {
  const record = await seal(fixture<PetraHypothesis>("hypothesis"));
  const receipt = fixture<PetraProjectExaminationReceipt>(
    "project-examination-receipt",
  );
  receipt.content.record_ref = await examinationReference(record);
  receipt.content.actor = record.created_by;
  await seal(receipt);
  const view = fixture<PetraProjectExaminationView>("project-examination-view");
  await seal(view.graph);
  view.records = [record];
  view.receipts = [receipt];
  return { record, receipt, view };
};
const client = (value: unknown, status = 200) => {
  const transport = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(JSON.stringify(value), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  return {
    transport,
    api: new ProjectExaminationClient({
      baseUrl: "https://petra.test",
      token: "fixture-token",
      fetch: transport,
    }),
  };
};

describe("Project examination client identity and recovery boundaries", () => {
  it("reads exact retained receipts and rejects a coherently rehashed receipt naming another record", async () => {
    const b = await basis();
    expect((await client(b.view).api.read(b.view.project_id)).receipts).toEqual(
      [b.receipt],
    );
    b.receipt.content.record_ref.record_id =
      "hypothesis_01K4E000000000000000000999";
    await seal(b.receipt);
    await expect(client(b.view).api.read(b.view.project_id)).rejects.toThrow(
      "different Project or record revision",
    );
  });
  it("recovers without posting and rejects a receipt whose exact reference was substituted", async () => {
    const b = await basis();
    const c = client({
      state: "recorded",
      outcome: "replayed",
      record: b.record,
      receipt: b.receipt,
    });
    const recovered = await c.api.recover(
      b.record.project_id,
      b.receipt.content.command_id,
    );
    expect(recovered?.record).toEqual(b.record);
    expect(c.transport).toHaveBeenCalledTimes(1);
    expect(c.transport.mock.calls[0]).toHaveLength(2);
    expect(c.transport.mock.calls[0]?.[1]).toMatchObject({
      headers: { authorization: "Bearer fixture-token" },
    });
    b.receipt.content.record_ref.revision += 1;
    await seal(b.receipt);
    await expect(
      client({
        state: "recorded",
        outcome: "replayed",
        record: b.record,
        receipt: b.receipt,
      }).api.recover(b.record.project_id, b.receipt.content.command_id),
    ).rejects.toThrow("do not agree");
  });
  it("distinguishes a known denial from an uncertain delivery without retrying either request", async () => {
    const b = await basis();
    const denied = client(
      { error: { code: "EXAMINATION_COMMAND_DENIED", message: "No grant." } },
      403,
    );
    await expect(denied.api.read(b.record.project_id)).rejects.toBeInstanceOf(
      ExaminationRequestRejected,
    );
    expect(denied.transport).toHaveBeenCalledTimes(1);
    const unknown = client(
      {
        error: {
          code: "EXAMINATION_UNAVAILABLE",
          message: "Delivery unknown.",
        },
      },
      409,
    );
    await expect(
      unknown.api.read(b.record.project_id),
    ).rejects.not.toBeInstanceOf(ExaminationRequestRejected);
    expect(unknown.transport).toHaveBeenCalledTimes(1);
  });
});
