import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraAssertion,
  PetraChangeSet,
  PetraDraftArtifact,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraWorkUnit,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import type { Pool, QueryResult } from "pg";
import { describe, expect, it } from "vitest";

import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";

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

const definition = fixture<PetraProjectDefinition>(
  "project-definition-scientific",
);
const source = fixture<PetraProjectSource>("project-source");
const assertion = fixture<PetraAssertion>("assertion-trusted");
const changeSet = fixture<PetraChangeSet>("change-set");
const workCurrent = fixture<PetraWorkUnit>("work-unit-completed");
const workRequested = fixture<PetraWorkUnit>("work-unit-requested");
const draft = fixture<PetraDraftArtifact>("draft-artifact");

interface Stored {
  current: unknown;
  currentLifecycle: string;
  selectedByRevision?: ReadonlyMap<number, unknown>;
  lifecycleByRevision?: ReadonlyMap<number, string>;
}

const stored = new Map<string, Stored>([
  [
    source.project_source_id,
    { current: source, currentLifecycle: source.content.status },
  ],
  [
    assertion.assertion_id,
    {
      current: assertion,
      currentLifecycle: `${assertion.authority.zone}_${assertion.authority.review_state}`,
    },
  ],
  [
    changeSet.change_set_id,
    { current: changeSet, currentLifecycle: changeSet.state },
  ],
  [
    workCurrent.work_unit_id,
    {
      current: workCurrent,
      currentLifecycle: workCurrent.status.state,
      selectedByRevision: new Map([[1, workRequested]]),
      lifecycleByRevision: new Map([[1, workRequested.status.state]]),
    },
  ],
  [draft.draft_artifact_id, { current: draft, currentLifecycle: "passed" }],
]);

const result = <Row extends Record<string, unknown>>(
  rows: Row[],
): QueryResult<Row> =>
  ({ rows, rowCount: rows.length }) as unknown as QueryResult<Row>;

class LocationClient {
  readonly projectId = definition.project_id;
  readonly corruptObjectId: string | undefined;
  readonly queries: string[] = [];

  constructor(corruptObjectId?: string) {
    this.corruptObjectId = corruptObjectId;
  }

  async query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    await Promise.resolve();
    this.queries.push(text);
    if (text.startsWith("BEGIN") || text === "COMMIT" || text === "ROLLBACK") {
      return result([]);
    }
    if (text.includes("transaction_timestamp()")) {
      return result([
        {
          read_at: new Date("2026-09-08T18:00:00.000Z"),
        } as unknown as Row,
      ]);
    }
    if (text.includes("FROM petra.projects AS project")) {
      return values[0] === this.projectId
        ? result([
            {
              definition_payload: structuredClone(definition),
            } as unknown as Row,
          ])
        : result([]);
    }
    if (text.includes("FROM petra.authority_positions AS authority")) {
      return result([
        {
          event_position: "3",
          stream_revision: "3",
        } as unknown as Row,
      ]);
    }
    if (text.includes("FROM petra.projection_checkpoints AS head")) {
      return result([]);
    }
    if (text.includes("WITH RECURSIVE chain AS")) {
      return result([]);
    }
    const objectIdValue = values[1];
    const objectId = typeof objectIdValue === "string" ? objectIdValue : "";
    const member = stored.get(objectId);
    if (member === undefined) return result([]);
    const current = member.current as { revision: number };
    const requested =
      values[2] === null || values[2] === undefined
        ? current.revision
        : Number(values[2]);
    const selected =
      requested === current.revision
        ? member.current
        : member.selectedByRevision?.get(requested);
    const selectedLifecycle =
      requested === current.revision
        ? member.currentLifecycle
        : member.lifecycleByRevision?.get(requested);
    const currentHash =
      objectId === this.corruptObjectId
        ? "sha256:0000000000000000000000000000000000000000000000000000000000000000"
        : canonicalHash(member.current);
    return result([
      {
        current_revision: String(current.revision),
        current_record_hash: currentHash,
        current_payload: structuredClone(member.current),
        current_lifecycle: member.currentLifecycle,
        selected_revision:
          selected === undefined
            ? null
            : String((selected as { revision: number }).revision),
        selected_record_hash:
          selected === undefined ? null : canonicalHash(selected),
        selected_payload:
          selected === undefined ? null : structuredClone(selected),
        selected_lifecycle: selectedLifecycle ?? null,
      } as unknown as Row,
    ]);
  }

  release(): void {}
}

const poolFor = (client: LocationClient): Pool =>
  ({ connect: () => Promise.resolve(client) }) as unknown as Pool;

describe("PostgreSQL Project semantic destination reader", () => {
  it("resolves the five M1 object kinds through one profile-aware registry", async () => {
    const client = new LocationClient();
    const reader = new PostgresProjectObjectLocationViewReader(poolFor(client));
    const cases = [
      {
        semanticKey: "petra.project-source",
        objectId: source.project_source_id,
        intent: "inspect" as const,
        role: "sources",
        family: "reference",
      },
      {
        semanticKey: "scientific.assertion",
        objectId: assertion.assertion_id,
        intent: "trace" as const,
        role: "graph",
        family: "relationship",
      },
      {
        semanticKey: "petra.change-set",
        objectId: changeSet.change_set_id,
        intent: "review" as const,
        role: "review",
        family: "other",
      },
      {
        semanticKey: "petra.work-unit",
        objectId: workCurrent.work_unit_id,
        intent: "continue_work" as const,
        role: "work",
        family: "task",
      },
      {
        semanticKey: "petra.draft-artifact",
        objectId: draft.draft_artifact_id,
        intent: "inspect" as const,
        role: "composition",
        family: "output",
      },
    ];

    for (const value of cases) {
      const view = await reader.locateProjectObject({
        project_id: definition.project_id,
        object_ref: {
          semantic_key: value.semanticKey,
          object_id: value.objectId,
        },
        task_intent: value.intent,
      });
      expect(view?.content.resolution.state).toBe("current");
      expect(view?.content.primary_destination.role).toBe(value.role);
      expect(view?.content.primary_destination).not.toHaveProperty("path");
      const resolution = view?.content.resolution;
      if (resolution?.state !== "current") {
        throw new Error("Expected a resolved current semantic location.");
      }
      expect(resolution.descriptor.generic_family).toBe(value.family);
      expect(resolution.resolved_ref).toEqual(resolution.current_ref);
      expect(view?.content.fallback_destination?.role).toBe("brief");
      expect(view?.content.projection.state).toBe("unavailable");
    }
  });

  it("routes an exact retained revision to History instead of substituting current", async () => {
    const reader = new PostgresProjectObjectLocationViewReader(
      poolFor(new LocationClient()),
    );
    const view = await reader.locateProjectObject({
      project_id: definition.project_id,
      object_ref: {
        semantic_key: "petra.work-unit",
        object_id: workCurrent.work_unit_id,
        revision: 1,
      },
      task_intent: "inspect",
    });
    const resolution = view?.content.resolution;
    expect(resolution?.state).toBe("historical");
    if (resolution?.state !== "historical") {
      throw new Error("Expected a historical semantic location.");
    }
    expect(resolution.resolved_ref.revision).toBe(1);
    expect(resolution.current_ref.revision).toBe(4);
    expect(view?.content.primary_destination.role).toBe("history");
  });

  it("uses the same non-disclosing fallback for missing identities and revisions", async () => {
    const reader = new PostgresProjectObjectLocationViewReader(
      poolFor(new LocationClient()),
    );
    for (const objectId of [
      "project_source_01K4C000000000000000000099",
      source.project_source_id,
    ]) {
      const view = await reader.locateProjectObject({
        project_id: definition.project_id,
        object_ref: {
          semantic_key: "petra.project-source",
          object_id: objectId,
          ...(objectId === source.project_source_id ? { revision: 99 } : {}),
        },
        task_intent: "inspect",
      });
      expect(view?.content.resolution).toEqual({
        state: "missing",
        requested_ref: {
          semantic_key: "petra.project-source",
          object_id: objectId,
          ...(objectId === source.project_source_id ? { revision: 99 } : {}),
        },
        failure: {
          code: "OBJECT_UNAVAILABLE",
          message:
            "The requested object or exact revision is unavailable in this Project.",
        },
      });
      expect(view?.content.primary_destination.role).toBe("brief");
      expect(view?.content.context).toEqual({
        details_allowed: false,
        petra_allowed: false,
      });
    }
  });

  it("fails unsupported semantics safely and never substitutes another Project", async () => {
    const reader = new PostgresProjectObjectLocationViewReader(
      poolFor(new LocationClient()),
    );
    const unsupported = await reader.locateProjectObject({
      project_id: definition.project_id,
      object_ref: {
        semantic_key: "writing.scene",
        object_id: "scene_01K4C000000000000000000099",
      },
      task_intent: "inspect",
    });
    expect(unsupported?.content.resolution.state).toBe("unsupported");
    expect(unsupported?.content.primary_destination.role).toBe("brief");

    await expect(
      reader.locateProjectObject({
        project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        object_ref: {
          semantic_key: "petra.project-source",
          object_id: source.project_source_id,
        },
        task_intent: "inspect",
      }),
    ).resolves.toBeUndefined();
  });

  it("refuses a stored record whose exact hash cannot be reproduced", async () => {
    const reader = new PostgresProjectObjectLocationViewReader(
      poolFor(new LocationClient(workCurrent.work_unit_id)),
    );
    await expect(
      reader.locateProjectObject({
        project_id: definition.project_id,
        object_ref: {
          semantic_key: "petra.work-unit",
          object_id: workCurrent.work_unit_id,
        },
        task_intent: "inspect",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_OBJECT_LOCATION_STORED_RECORD_CORRUPT",
    });
  });
});
