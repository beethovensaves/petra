import { readFileSync } from "node:fs";

import type {
  PetraArtifact,
  PetraDomainEvent,
  PetraOutboxRecord,
  PetraProject,
  PetraSourceSpan,
  PetraWork,
  PetraWorkVersion,
  ProjectionIdentity,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  buildAuthorityGraphBatch,
  type AuthorityGraphProjectionLoadError,
} from "../src/authority-graph-projection.js";
import { graphProjectionEffectForOutbox } from "../src/graph-projection-registry.js";

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

const outboxFixture = (): PetraOutboxRecord => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  return {
    schema_name: "petra.outbox-record",
    schema_version: "1.0.0",
    outbox_id: "outbox_01ARZ3NDEKTSV4RRFFQ69G5FC6",
    outbox_position: 3,
    target: "neo4j_graph",
    target_sequence: 1,
    partition_key: event.project_id,
    deduplication_key: `neo4j_graph:${event.event_id}`,
    enqueued_at: event.recorded_at,
    message: { message_kind: "domain_event", event },
  };
};

const projection: ProjectionIdentity = {
  target: "neo4j_graph",
  projection_name: "petra.authority_graph",
  projection_version: "1.0.0",
  configuration_hash: `sha256:${"a".repeat(64)}`,
};

const materialFixture = () => {
  const outbox = outboxFixture();
  const event = outbox.message.event;
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected applied ChangeSet fixture.");
  }
  return {
    project: readFixture<PetraProject>("project"),
    work: readFixture<PetraWork>("work"),
    workVersion: readFixture<PetraWorkVersion>("work-version"),
    artifacts: [readFixture<PetraArtifact>("artifact")],
    sourceSpans: [readFixture<PetraSourceSpan>("source-span")],
    claim: structuredClone(event.event.payload.claim),
    assertion: structuredClone(event.event.payload.assertion),
  };
};

describe("authority graph batch", () => {
  it("materializes visible identities, trust, provenance, and source limits", () => {
    const outbox = outboxFixture();
    const batch = buildAuthorityGraphBatch(
      projection,
      outbox,
      materialFixture(),
    );
    expect(batch.nodes.map((node) => node.kind).sort()).toEqual([
      "Artifact",
      "Claim",
      "Project",
      "SourceSpan",
      "Work",
      "WorkVersion",
    ]);
    expect(
      batch.relationships.map((relationship) => relationship.predicate),
    ).toEqual(
      expect.arrayContaining([
        "PROJECTS",
        "VERSION_OF",
        "REPRESENTED_BY",
        "LOCATED_IN",
        "GROUNDED_IN",
        "ASSERTS",
      ]),
    );
    const assertion = batch.relationships.find(
      (relationship) => relationship.predicate === "ASSERTS",
    );
    expect(assertion).toEqual(
      expect.objectContaining({
        assertionId: materialFixture().assertion.assertion_id,
        relationClass: "representation",
        authoritativeRevision: 2,
      }),
    );
    expect(assertion?.properties).toEqual(
      expect.objectContaining({
        authority_zone: "trusted",
        review_state: "human_accepted",
      }),
    );
    const span = batch.nodes.find((node) => node.kind === "SourceSpan");
    expect(span?.properties).not.toHaveProperty("exact_text");
    expect(span?.properties).toEqual(
      expect.objectContaining({
        selected_text_hash:
          "sha256:11dbfa18f25f2587c4e96225884e2d6d1c9e4362210ebf34b3197c03bd05cda6",
        page_number: 1,
        section_path: ["Results", "Paragraph 1"],
      }),
    );
  });

  it("fails closed when supplied material differs from the outbox authority", () => {
    const outbox = outboxFixture();
    const material = materialFixture();
    material.claim.canonical_text = "A projection-local fabrication.";
    expect(() =>
      buildAuthorityGraphBatch(projection, outbox, material),
    ).toThrow(
      expect.objectContaining({
        code: "GRAPH_SOURCE_AUTHORITY_MISMATCH",
      } satisfies Partial<AuthorityGraphProjectionLoadError>),
    );
  });

  it("reports only the authoritative Claim and Assertion as outbox effects", () => {
    expect(graphProjectionEffectForOutbox(outboxFixture()).objects).toEqual([
      expect.objectContaining({
        graph_element_kind: "node",
        object_id: materialFixture().claim.claim_id,
        object_revision: 2,
      }),
      expect.objectContaining({
        graph_element_kind: "relationship",
        object_id: materialFixture().assertion.assertion_id,
        object_revision: 2,
      }),
    ]);
  });
});
