import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraProjectReviewView,
  PetraProjectReviewViewV110,
  PetraProjectReviewViewV120,
  PetraProjectReviewViewV130,
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

  it("exposes exact lifecycle without inventing operation eligibility", () => {
    const legacy = readFixture<PetraProjectReviewView>("project-review-view");
    const legacyMember = legacy.content.members[0];
    if (legacyMember === undefined) {
      throw new Error("Expected the scientific Review fixture member.");
    }
    const content: PetraProjectReviewViewV120["content"] = {
      ...structuredClone(legacy.content),
      session: {
        ...structuredClone(legacy.content.session),
        lifecycle: "deferred",
        status: "waiting",
        status_label: "Waiting",
      },
      members: [
        {
          ...structuredClone(legacyMember),
          working_state: {
            candidate,
            relationships: [relationship],
            selection_basis: "exact_review_session_working_bindings",
            authority_effect: "none",
          },
          change_sets: legacyMember.change_sets.map((changeSet) => ({
            ...structuredClone(changeSet),
            commands: [],
            events: [],
          })),
        },
      ],
      projection: {
        state: "unavailable",
        reason:
          "No authoritative graph-projection checkpoint is registered for this Project.",
      },
    };
    const view: PetraProjectReviewViewV120 = {
      schema_name: "petra.project-review-view",
      schema_version: "1.2.0",
      project_id: legacy.project_id,
      review_session_id: session.review_session_id,
      content,
      content_hash: canonicalHash(content),
      read_at: legacy.read_at,
    };
    contracts.assertValid("project-review-view", "1.2.0", view);

    const missingLifecycle = structuredClone(view) as unknown as {
      content: { session: { lifecycle?: unknown } };
    };
    delete missingLifecycle.content.session.lifecycle;
    expect(
      contracts.isValid("project-review-view", "1.2.0", missingLifecycle),
    ).toBe(false);

    const inventedEligibility = structuredClone(view) as unknown as {
      content: { session: Record<string, unknown> };
    };
    inventedEligibility.content.session.eligible_operation = "reopen";
    expect(
      contracts.isValid("project-review-view", "1.2.0", inventedEligibility),
    ).toBe(false);
  });

  it("keeps the registered controlled-writing Review payload distinct and non-applicable", () => {
    const legacy = readFixture<PetraProjectReviewView>("project-review-view");
    const legacyMember = legacy.content.members[0];
    if (legacyMember === undefined) {
      throw new Error("Expected the scientific Review fixture member.");
    }
    const content: PetraProjectReviewViewV130["content"] = {
      ...structuredClone(legacy.content),
      session: {
        ...structuredClone(legacy.content.session),
        lifecycle: "open",
        project_definition_label: "Controlled writing",
      },
      members: [
        {
          ...structuredClone(legacyMember),
          candidate: {
            ...structuredClone(legacyMember.candidate),
            kind_label: "Requirement and governing link",
            current:
              "No authoritative controlled-writing representation is installed",
            proposed:
              "The operating procedure must identify the exact authority source for each mandatory step.",
            difference:
              "Adds one non-authoritative Requirement and its exact GOVERNS relationship to Review. No controlled-writing mutation operation or Apply path is installed.",
            profile_payload: {
              payload_kind: "controlled_writing_requirement",
              requirement_ref: {
                schema_name: "petra.controlled-writing-requirement",
                schema_version: "1.0.0",
                record_id: "requirement_01K4E000000000000000000004",
                revision: 1,
                record_hash: `sha256:${"1".repeat(64)}`,
              },
              governing_relationship_ref: {
                schema_name: "petra.controlled-writing-governing-relationship",
                schema_version: "1.0.0",
                record_id: "governing_relationship_01K4E000000000000000000005",
                revision: 1,
                record_hash: `sha256:${"2".repeat(64)}`,
              },
              authority_source_ref: {
                schema_name: "petra.project-source",
                schema_version: "1.0.0",
                record_id: "project_source_01K4E000000000000000000006",
                revision: 1,
                record_hash: `sha256:${"3".repeat(64)}`,
              },
              requirement_kind: "constraint",
              relationship_predicate: "GOVERNS",
              apply_available: false,
            },
          },
          working_state: {
            candidate,
            relationships: [relationship],
            selection_basis: "exact_review_session_working_bindings",
            authority_effect: "none",
          },
          validation: {
            state: "needs_judgment",
            label: "Validation pending",
            detail:
              "Review inclusion does not approve the Requirement or create an Apply path.",
          },
          consequences: [
            "No controlled-writing ChangeSet operation, Approval, or Apply path is installed.",
          ],
          change_sets: [],
        },
      ],
      projection: {
        state: "unavailable",
        reason:
          "No authoritative graph-projection checkpoint is registered for this Project.",
      },
    };
    const view: PetraProjectReviewViewV130 = {
      schema_name: "petra.project-review-view",
      schema_version: "1.3.0",
      project_id: legacy.project_id,
      review_session_id: session.review_session_id,
      content,
      content_hash: canonicalHash(content),
      read_at: legacy.read_at,
    };
    contracts.assertValid("project-review-view", "1.3.0", view);

    const inventedApply = structuredClone(view) as unknown as {
      content: {
        members: Array<{
          candidate: { profile_payload: { apply_available: boolean } };
        }>;
      };
    };
    inventedApply.content.members[0]!.candidate.profile_payload.apply_available = true;
    expect(
      contracts.isValid("project-review-view", "1.3.0", inventedApply),
    ).toBe(false);

    const arbitraryProfile = structuredClone(view) as unknown as {
      content: {
        members: Array<{
          candidate: { profile_payload: { payload_kind: string } };
        }>;
      };
    };
    arbitraryProfile.content.members[0]!.candidate.profile_payload.payload_kind =
      "client_defined";
    expect(
      contracts.isValid("project-review-view", "1.3.0", arbitraryProfile),
    ).toBe(false);

    const resealedRequirement = structuredClone(view) as unknown as {
      content: {
        members: Array<{
          candidate: {
            profile_payload: { requirement_ref: { schema_name: string } };
          };
        }>;
      };
    };
    resealedRequirement.content.members[0]!.candidate.profile_payload.requirement_ref.schema_name =
      "petra.claim";
    expect(
      contracts.isValid("project-review-view", "1.3.0", resealedRequirement),
    ).toBe(false);
  });
});
