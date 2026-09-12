import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraProjectReviewView,
  PetraProjectReviewViewV110,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

describe("working ReviewSession composition contracts", () => {
  const contracts = new PetraContractRegistry();
  const session = readFixture<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  const candidate = readFixture<PetraWorkingCandidate>("working-candidate");
  const relationship = readFixture<PetraWorkingRelationship>(
    "working-relationship",
  );

  it("binds exact canonical working records without replacing profile semantics", () => {
    contracts.assertValid("review-session", "1.1.0", session);
    expect(session.content_hash).toBe(canonicalHash(session.content));
    expect(session.content.members[0]?.working_state).toStrictEqual({
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      relationship_refs: [
        {
          working_relationship_id: relationship.working_relationship_id,
          revision: relationship.revision,
          content_hash: relationship.content_hash,
        },
      ],
    });
    expect(session.content.members[0]?.candidate_bindings).toMatchObject([
      {
        semantic_key: candidate.profile_object.registration.semantic_key,
        record_ref: {
          record_id: candidate.profile_object.object_record_ref.record_id,
          revision: candidate.profile_object.object_record_ref.revision,
          record_hash: candidate.profile_object.object_record_ref.record_hash,
        },
      },
      {
        semantic_key:
          relationship.profile_relationship.registration.semantic_key,
        record_ref: {
          record_id:
            relationship.profile_relationship.relationship_record_ref.record_id,
          revision:
            relationship.profile_relationship.relationship_record_ref.revision,
          record_hash:
            relationship.profile_relationship.relationship_record_ref
              .record_hash,
        },
      },
    ]);
  });

  it("rejects missing working identity and injected authority", () => {
    const missingWorking = structuredClone(session) as unknown as {
      content: { members: Array<{ working_state?: unknown }> };
    };
    delete missingWorking.content.members[0]?.working_state;
    expect(contracts.isValid("review-session", "1.1.0", missingWorking)).toBe(
      false,
    );

    const implicitAuthority = structuredClone(session) as unknown as {
      content: {
        members: Array<{
          working_state: Record<string, unknown>;
        }>;
      };
    };
    implicitAuthority.content.members[0]!.working_state.authorized = true;
    expect(
      contracts.isValid("review-session", "1.1.0", implicitAuthority),
    ).toBe(false);
  });

  it("projects canonical working records and explicit receipt boundaries", () => {
    const legacy = readFixture<PetraProjectReviewView>("project-review-view");
    const legacyMember = legacy.content.members[0];
    if (legacyMember === undefined) {
      throw new Error("Expected the scientific Review fixture member.");
    }
    const content = {
      ...structuredClone(legacy.content),
      members: [
        {
          ...structuredClone(legacyMember),
          working_state: {
            candidate,
            relationships: [relationship],
            selection_basis: "exact_review_session_working_bindings" as const,
            authority_effect: "none" as const,
          },
          change_sets: legacyMember.change_sets.map((changeSet) => ({
            ...structuredClone(changeSet),
            commands: [],
            events: [],
          })),
        },
      ] as PetraProjectReviewViewV110["content"]["members"],
      projection: {
        state: "unavailable" as const,
        reason:
          "No authoritative graph-projection checkpoint is registered for this Project.",
      },
    };
    const view: PetraProjectReviewViewV110 = {
      schema_name: "petra.project-review-view",
      schema_version: "1.1.0",
      project_id: legacy.project_id,
      review_session_id: session.review_session_id,
      content,
      content_hash: canonicalHash(content),
      read_at: legacy.read_at,
    };
    contracts.assertValid("project-review-view", "1.1.0", view);
    expect(view.content.members[0]?.working_state.authority_effect).toBe(
      "none",
    );
  });
});
