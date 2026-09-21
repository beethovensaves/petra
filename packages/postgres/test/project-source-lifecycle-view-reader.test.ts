import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraArtifactManifest,
  PetraProjectSource,
  PetraReviewSessionV110,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import type { Pool, QueryResult } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresProjectSourceLifecycleViewReader } from "../src/project-source-lifecycle-view-reader.js";

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const result = <Row extends Record<string, unknown>>(
  rows: Row[],
): QueryResult<Row> =>
  ({ rows, rowCount: rows.length }) as unknown as QueryResult<Row>;

const source = fixture<PetraProjectSource>("project-source");
const manifest = fixture<PetraArtifactManifest>("artifact-manifest");
const review = fixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);

describe("PostgreSQL Project source lifecycle view reader", () => {
  it("validates an open Review with its stored review-session schema version", async () => {
    const client = {
      query: vi.fn(
        async <Row extends Record<string, unknown>>(
          text: string,
        ): Promise<QueryResult<Row>> => {
          await Promise.resolve();
          if (
            text.startsWith("BEGIN") ||
            text === "COMMIT" ||
            text === "ROLLBACK"
          ) {
            return result([]);
          }
          if (text.includes("transaction_timestamp()")) {
            return result([
              {
                read_at: new Date("2026-09-20T20:00:00.000Z"),
              } as unknown as Row,
            ]);
          }
          if (text.includes("FROM petra.project_sources AS source")) {
            return result([
              {
                payload: structuredClone(source),
                record_hash: canonicalHash(source),
              } as unknown as Row,
            ]);
          }
          if (text.includes("FROM petra.artifact_manifests")) {
            return result([
              {
                artifact_id: manifest.artifact_id,
                payload: structuredClone(manifest),
                record_hash: canonicalHash(manifest),
              } as unknown as Row,
            ]);
          }
          if (text.includes("FROM petra.review_sessions AS head")) {
            return result([
              {
                record_id: review.review_session_id,
                revision: String(review.revision),
                record_hash: canonicalHash(review),
                payload: structuredClone(review),
                posture: "current",
                total_count: "1",
              } as unknown as Row,
            ]);
          }
          if (text.includes("FROM petra.authority_positions AS authority")) {
            return result([
              {
                event_position: "42",
                stream_revision: "7",
              } as unknown as Row,
            ]);
          }
          return result([]);
        },
      ),
      release: vi.fn(),
    };
    const pool = {
      connect: () => Promise.resolve(client),
    } as unknown as Pool;

    const view = await new PostgresProjectSourceLifecycleViewReader(
      pool,
    ).getProjectSourceLifecycleView(
      source.project_id,
      source.project_source_id,
      "exclude_project_source",
    );

    expect(view?.content.impact.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group_kind: "open_reviews",
          total_count: 1,
          returned_count: 1,
          refs: [
            {
              record_kind: "review_session",
              record_id: review.review_session_id,
              revision: review.revision,
              record_hash: canonicalHash(review),
              posture: "current",
              effect: "retained",
            },
          ],
        }),
      ]),
    );
    expect(client.release).toHaveBeenCalledOnce();
  });
});
