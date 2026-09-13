import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraAssertion,
  PetraClaim,
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectWorkingStateSnapshot,
  PetraProjectThread,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";

const readJson = <Value>(relativePath: string): Value =>
  JSON.parse(
    readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"),
  ) as Value;

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const workingRevisionHash = (value: { content_hash: string }): string => {
  const projection = structuredClone(value) as Record<string, unknown>;
  delete projection.content_hash;
  return recordHash(projection);
};

const contentHash = (value: { content: unknown }): string =>
  recordHash(value.content);

const exactContractKey = (contract: {
  name: string;
  version: string;
  content_hash: string;
}): string => `${contract.name}@${contract.version}#${contract.content_hash}`;

describe("WorkingCandidate and WorkingRelationship contracts", () => {
  const registry = new PetraContractRegistry();
  const definition = readJson<PetraProjectDefinition>(
    "fixtures/accepted/project-definition-working-scientific.json",
  );
  const claim = readJson<PetraClaim>("fixtures/accepted/claim.json");
  const correctedClaim = readJson<PetraClaim>(
    "fixtures/accepted/claim-working-correction.json",
  );
  const assertion = readJson<PetraAssertion>(
    "fixtures/accepted/assertion.json",
  );
  const candidate = readJson<PetraWorkingCandidate>(
    "fixtures/accepted/working-candidate.json",
  );
  const correction = readJson<PetraWorkingCandidate>(
    "fixtures/accepted/working-candidate-correction.json",
  );
  const correctionThread = readJson<PetraProjectThread>(
    "fixtures/accepted/project-thread-working-scientific.json",
  );
  const relationship = readJson<PetraWorkingRelationship>(
    "fixtures/accepted/working-relationship.json",
  );
  const writingDefinition = readJson<PetraProjectDefinition>(
    "fixtures/accepted/project-definition-controlled-writing.json",
  );
  const writingObjective = readJson<PetraProjectObjective>(
    "fixtures/accepted/project-objective-controlled-writing.json",
  );
  const requirement = readJson<PetraControlledWritingRequirement>(
    "fixtures/accepted/controlled-writing-requirement.json",
  );
  const governing = readJson<PetraControlledWritingGoverningRelationship>(
    "fixtures/accepted/controlled-writing-governing-relationship.json",
  );

  const controlledCandidate = (): PetraWorkingCandidate => {
    const value = structuredClone(candidate);
    value.working_candidate_id = "working_candidate_01K4E000000000000000000007";
    value.project_id = writingDefinition.project_id;
    value.project_definition_ref = {
      project_definition_id: writingDefinition.project_definition_id,
      revision: writingDefinition.revision,
      content_hash: writingDefinition.content_hash,
      definition_family: writingDefinition.definition_family,
    };
    value.profile_object = {
      registration: structuredClone(
        writingDefinition.content.registrations.find(
          (entry) => entry.semantic_key === "writing.requirement",
        )!,
      ) as PetraWorkingCandidate["profile_object"]["registration"],
      object_record_ref: {
        schema_name: requirement.schema_name,
        schema_version: requirement.schema_version,
        record_id: requirement.requirement_id,
        revision: requirement.revision,
        record_hash: recordHash(requirement),
      },
      candidate_operation: "create",
    };
    value.producer = {
      producer_kind: "human",
      actor: {
        actor_id: requirement.created_by.actor_id,
        actor_kind: "human",
      },
      contribution_kind: "direct_edit",
    };
    value.task_context.objective_ref = {
      schema_name: writingObjective.schema_name,
      schema_version: writingObjective.schema_version,
      record_id: writingObjective.objective_id,
      revision: writingObjective.revision,
      record_hash: recordHash(writingObjective),
    };
    value.validation = {
      state: "pending",
      target_record_hash: recordHash(requirement),
      results: [],
    };
    value.lineage = { lineage_kind: "root" };
    value.created_by = structuredClone(requirement.created_by);
    value.created_at = requirement.created_at;
    value.recorded_at = "2026-09-13T14:02:00.000Z";
    value.content_hash = workingRevisionHash(value);
    return value;
  };

  const controlledRelationship = (
    target: PetraWorkingCandidate,
  ): PetraWorkingRelationship => {
    const value = structuredClone(relationship);
    value.working_relationship_id =
      "working_relationship_01K4E000000000000000000008";
    value.project_id = writingDefinition.project_id;
    value.project_definition_ref = structuredClone(
      target.project_definition_ref,
    );
    value.profile_relationship = {
      registration: structuredClone(
        writingDefinition.content.registrations.find(
          (entry) => entry.semantic_key === "writing.governs",
        )!,
      ) as PetraWorkingRelationship["profile_relationship"]["registration"],
      predicate: "GOVERNS",
      relationship_record_ref: {
        schema_name: governing.schema_name,
        schema_version: governing.schema_version,
        record_id: governing.governing_relationship_id,
        revision: governing.revision,
        record_hash: recordHash(governing),
      },
      candidate_operation: "create",
    };
    value.endpoints = {
      subject: {
        endpoint_kind: "profile_record",
        record_ref: structuredClone(governing.content.authority_source_ref),
      },
      object: {
        endpoint_kind: "working_candidate",
        candidate_ref: {
          working_candidate_id: target.working_candidate_id,
          revision: target.revision,
          content_hash: target.content_hash,
        },
      },
    };
    value.producer = structuredClone(target.producer);
    value.task_context = structuredClone(target.task_context);
    value.input_snapshot = structuredClone(target.input_snapshot);
    value.origin = structuredClone(target.origin);
    value.basis = structuredClone(target.basis);
    value.provenance = structuredClone(target.provenance);
    value.qualifications = structuredClone(target.qualifications);
    value.validation = {
      state: "pending",
      target_record_hash: recordHash(governing),
      results: [],
    };
    value.lineage = { lineage_kind: "root" };
    value.created_by = structuredClone(governing.created_by);
    value.created_at = governing.created_at;
    value.recorded_at = "2026-09-13T14:03:00.000Z";
    value.content_hash = workingRevisionHash(value);
    return value;
  };

  it("installs distinct controlled-writing Requirement and governing-relationship contracts with exact registry hashes", () => {
    registry.assertValid(
      "controlled-writing-requirement",
      "1.0.0",
      requirement,
    );
    registry.assertValid(
      "controlled-writing-governing-relationship",
      "1.0.0",
      governing,
    );
    expect(requirement.content_hash).toBe(contentHash(requirement));
    expect(governing.content_hash).toBe(contentHash(governing));

    const requirementEntry = registry.entries.find(
      (entry) => entry.name === "controlled-writing-requirement",
    );
    const governingEntry = registry.entries.find(
      (entry) => entry.name === "controlled-writing-governing-relationship",
    );
    expect(
      writingDefinition.content.registrations.find(
        (entry) => entry.semantic_key === "writing.requirement",
      )?.contract,
    ).toEqual({
      name: "petra.controlled-writing-requirement",
      version: "1.0.0",
      content_hash: requirementEntry?.canonical_sha256,
    });
    expect(
      writingDefinition.content.registrations.find(
        (entry) => entry.semantic_key === "writing.governs",
      )?.contract,
    ).toEqual({
      name: "petra.controlled-writing-governing-relationship",
      version: "1.0.0",
      content_hash: governingEntry?.canonical_sha256,
    });

    const workingRequirement = controlledCandidate();
    const workingGoverning = controlledRelationship(workingRequirement);
    registry.assertValid("working-candidate", "1.0.0", workingRequirement);
    registry.assertValid("working-relationship", "1.0.0", workingGoverning);
    expect(workingRequirement.content_hash).toBe(
      workingRevisionHash(workingRequirement),
    );
    expect(workingGoverning.content_hash).toBe(
      workingRevisionHash(workingGoverning),
    );
    expect(
      workingRequirement.profile_object.object_record_ref.schema_name,
    ).toBe(requirement.schema_name);
    expect(
      workingGoverning.profile_relationship.relationship_record_ref.schema_name,
    ).toBe(governing.schema_name);
    expect(workingGoverning.profile_relationship.predicate).toBe("GOVERNS");
    expect(workingRequirement.producer.producer_kind).toBe("human");
    expect(candidate.producer.producer_kind).toBe("model");
    expect(requirement.authority_boundary).toEqual({
      domain_authority: false,
      review_decision: false,
      mutation_authority: false,
      apply_path: false,
    });
  });

  it("binds the scientific Claim and ASSERTS records through exact registered profile contracts", () => {
    registry.assertValid("working-candidate", "1.0.0", candidate);
    registry.assertValid("working-relationship", "1.0.0", relationship);
    expect(candidate.content_hash).toBe(workingRevisionHash(candidate));
    expect(relationship.content_hash).toBe(workingRevisionHash(relationship));

    expect(candidate.project_id).toBe(definition.project_id);
    expect(candidate.project_definition_ref).toMatchObject({
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    });

    const objectRegistration = definition.content.registrations.find(
      (entry) =>
        entry.registration_kind === "object_schema" &&
        entry.semantic_key ===
          candidate.profile_object.registration.semantic_key,
    );
    expect(objectRegistration).toBeDefined();
    expect(
      exactContractKey(candidate.profile_object.registration.contract),
    ).toBe(exactContractKey(objectRegistration!.contract));
    expect(candidate.profile_object.registration.contract.name).toBe(
      claim.schema_name,
    );
    expect(candidate.profile_object.object_record_ref).toMatchObject({
      schema_name: claim.schema_name,
      schema_version: claim.schema_version,
      record_id: claim.claim_id,
      revision: claim.revision,
      record_hash: recordHash(claim),
    });
    registry.assertValid("claim", "1.0.0", claim);
    expect(candidate.validation.target_record_hash).toBe(recordHash(claim));

    if (candidate.producer.producer_kind !== "model") {
      throw new Error("Expected the model-produced candidate fixture.");
    }
    const modelRoleRegistration = definition.content.registrations.find(
      (entry) => entry.registration_kind === "model_role",
    );
    expect(modelRoleRegistration).toBeDefined();
    expect(exactContractKey(candidate.producer.model_role_ref)).toBe(
      exactContractKey(modelRoleRegistration!.contract),
    );

    const relationshipRegistration = definition.content.registrations.find(
      (entry) =>
        entry.registration_kind === "relationship_schema" &&
        entry.semantic_key ===
          relationship.profile_relationship.registration.semantic_key,
    );
    expect(relationshipRegistration).toBeDefined();
    expect(
      exactContractKey(relationship.profile_relationship.registration.contract),
    ).toBe(exactContractKey(relationshipRegistration!.contract));
    expect(relationship.profile_relationship.registration.contract.name).toBe(
      assertion.schema_name,
    );
    expect(relationship.profile_relationship).toMatchObject({
      predicate: assertion.predicate,
      relationship_record_ref: {
        schema_name: assertion.schema_name,
        schema_version: assertion.schema_version,
        record_id: assertion.assertion_id,
        revision: assertion.revision,
        record_hash: recordHash(assertion),
      },
    });
    expect(relationship.endpoints.object).toStrictEqual({
      endpoint_kind: "working_candidate",
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
    });
    expect(relationship.endpoints.subject).toMatchObject({
      endpoint_kind: "profile_record",
      record_ref: { record_id: assertion.subject_id },
    });
    registry.assertValid("assertion", "1.0.0", assertion);
    expect(relationship.validation.target_record_hash).toBe(
      recordHash(assertion),
    );

    const registeredValidators = new Set(
      definition.content.registrations
        .filter((entry) => entry.registration_kind === "validator")
        .map((entry) => exactContractKey(entry.contract)),
    );
    for (const result of [
      ...candidate.validation.results,
      ...relationship.validation.results,
    ]) {
      expect(registeredValidators).toContain(
        exactContractKey(result.validator_ref),
      );
    }
  });

  it("retains a human material correction as an exact superseding revision with validation pending", () => {
    registry.assertValid("working-candidate", "1.0.0", correction);
    registry.assertValid("claim", "1.0.0", correctedClaim);
    expect(correction.content_hash).toBe(workingRevisionHash(correction));

    expect(correction.working_candidate_id).toBe(
      candidate.working_candidate_id,
    );
    expect(correction.revision).toBe(2);
    expect(correction.profile_object.object_record_ref).toMatchObject({
      record_id: correctedClaim.claim_id,
      revision: correctedClaim.revision,
      record_hash: recordHash(correctedClaim),
    });
    expect(correction.producer.producer_kind).toBe("human");
    expect(correction.task_context).toMatchObject({
      task_kind: "thread_turn",
      thread_binding: {
        project_thread_ref: {
          record_id: correctionThread.project_thread_id,
          revision: correctionThread.revision,
          record_hash: recordHash(correctionThread),
        },
        project_turn_id: correctionThread.content.turns[0]?.project_turn_id,
      },
    });
    expect(correction.lineage).toStrictEqual({
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      change_kind: "material_revision",
      reason:
        "The author narrowed the candidate to the study-defined evaluation task.",
    });
    expect(correction.validation).toMatchObject({
      state: "pending",
      results: [],
    });
    expect(correction.authority_boundary.domain_authority).toBe(false);
  });

  it("rejects missing model attribution, broken revision lineage, implicit authority, and invalid validation state", () => {
    const missingModelRole = structuredClone(candidate) as unknown as {
      producer: { producer_kind: string; model_role_ref?: unknown };
    };
    if (missingModelRole.producer.producer_kind !== "model") {
      throw new Error("Expected the model-produced candidate fixture.");
    }
    delete missingModelRole.producer.model_role_ref;
    expect(
      registry.isValid("working-candidate", "1.0.0", missingModelRole),
    ).toBe(false);

    const brokenLineage = structuredClone(correction) as unknown as {
      lineage: unknown;
    };
    brokenLineage.lineage = { lineage_kind: "root" };
    expect(registry.isValid("working-candidate", "1.0.0", brokenLineage)).toBe(
      false,
    );

    const implicitAuthority = structuredClone(relationship) as unknown as {
      authority_boundary: { domain_authority: boolean };
    };
    implicitAuthority.authority_boundary.domain_authority = true;
    expect(
      registry.isValid("working-relationship", "1.0.0", implicitAuthority),
    ).toBe(false);

    const invalidValidation = structuredClone(candidate) as unknown as {
      validation: unknown;
    };
    invalidValidation.validation = {
      state: "completed",
      target_record_hash: candidate.validation.target_record_hash,
      results: [],
    };
    expect(
      registry.isValid("working-candidate", "1.0.0", invalidValidation),
    ).toBe(false);
  });

  it("rejects the wrong registration class and revision intent without an exact authoritative base", () => {
    const wrongRegistration = structuredClone(relationship) as unknown as {
      profile_relationship: {
        registration: { registration_kind: string };
      };
    };
    wrongRegistration.profile_relationship.registration.registration_kind =
      "object_schema";
    expect(
      registry.isValid("working-relationship", "1.0.0", wrongRegistration),
    ).toBe(false);

    const unboundRevision = structuredClone(candidate) as unknown as {
      profile_object: { candidate_operation: string };
    };
    unboundRevision.profile_object.candidate_operation = "revise";
    expect(
      registry.isValid("working-candidate", "1.0.0", unboundRevision),
    ).toBe(false);
  });

  it("keeps the snapshot-consistent query textual and explicitly non-authoritative", () => {
    const content: PetraProjectWorkingStateSnapshot["content"] = {
      project_definition_ref: candidate.project_definition_ref,
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
      candidates: [correction],
      relationships: [relationship],
    };
    const snapshot: PetraProjectWorkingStateSnapshot = {
      schema_name: "petra.project-working-state-snapshot",
      schema_version: "1.0.0",
      project_id: candidate.project_id,
      content,
      content_hash: recordHash(content),
      read_at: "2026-09-12T14:20:00.000Z",
    };
    registry.assertValid("project-working-state-snapshot", "1.0.0", snapshot);
    expect(snapshot.content.selection_boundary).toStrictEqual({
      selection_kind: "current_working_heads",
      historical_working_revisions_included: false,
      authoritative_records_included: false,
      graph_overlay_composed: false,
    });

    const implicitOverlay = structuredClone(snapshot) as unknown as {
      content: { selection_boundary: { graph_overlay_composed: boolean } };
    };
    implicitOverlay.content.selection_boundary.graph_overlay_composed = true;
    expect(
      registry.isValid(
        "project-working-state-snapshot",
        "1.0.0",
        implicitOverlay,
      ),
    ).toBe(false);
  });
});
