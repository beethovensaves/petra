import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { type PetraProjectDefinition } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ProfileCommunicationResolver,
  type CommunicationDefinitionBinding,
  type CommunicationReferenceRequest,
} from "../src/profile-communication.js";

const contracts = new PetraContractRegistry();
const resolver = new ProfileCommunicationResolver(contracts);
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const seal = (definition: PetraProjectDefinition): PetraProjectDefinition => {
  definition.content_hash = hash(definition.content);
  return definition;
};
const fixture = (): PetraProjectDefinition =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/project-definition-scientific.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
const definition = (): PetraProjectDefinition => {
  const value = fixture();
  const required = resolver.requiredRegistrations();
  value.content.registrations = [value.content.registrations[0], ...required];
  return seal(value);
};
const binding = (
  value: PetraProjectDefinition,
): CommunicationDefinitionBinding => ({
  project_id: value.project_id,
  project_definition_id: value.project_definition_id,
  revision: value.revision,
  content_hash: value.content_hash,
});
const reference: CommunicationReferenceRequest = {
  semantic_key: "scientific.claim",
  canonical_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
  revision: 2,
  content_hash: `sha256:${"a".repeat(64)}`,
  source_language: "en",
};
const resolve = (value = definition(), locale = "en") =>
  resolver.resolve(value, binding(value), locale);
const describeReference = (value = definition(), ref = reference) =>
  resolver.resolveReference(value, binding(value), "en", ref);
afterEach(() => vi.restoreAllMocks());

describe("profile communication prerequisite", () => {
  it("resolves only exact opted-in definitions and installed payload semantics", () => {
    const value = definition();
    const before = structuredClone(value);
    const result = resolve(value);
    expect(result.state).toBe("resolved");
    expect(result.definition).toEqual(binding(value));
    expect(result.payload.profile.origins).toEqual({
      source_report: "attributed_report",
      petra_synthesis: "petra_assessment",
      unresolved_inference: "inference",
    });
    expect(result.response_language_validation).toBe("not_performed");
    expect(result.source_time_versions).toBe("not_observed_by_resolver");
    expect(result.payload.profile.structured_fields.force).toBe(
      "unavailable_in_source_schema",
    );
    expect(result.payload.profile.structured_fields.conditions).toBe(
      "unavailable_in_source_schema",
    );
    expect(value).toEqual(before);
  });

  it("does not opt existing definitions in", () => {
    const value = fixture();
    const before = structuredClone(value);
    expect(() => resolve(value)).toThrow(/missing or incompatible/);
    expect(value).toEqual(before);
  });

  it.each([
    "project_id",
    "project_definition_id",
    "content_hash",
    "revision",
  ] as const)("rejects mismatched expected %s", (key) => {
    const value = definition();
    const expected = binding(value);
    if (key === "revision") expected.revision += 1;
    else expected[key] += "wrong";
    expect(() => resolver.resolve(value, expected, "en")).toThrow(
      /exact Project-owned/,
    );
  });

  it("rejects altered definition bytes even when the claimed hash matches expected", () => {
    const value = definition();
    value.content.label += " altered";
    expect(() => resolve(value)).toThrow(/exact Project-owned/);
  });

  it("rejects a borrowed profile family", () => {
    const value = definition();
    value.definition_family = "petra.controlled-writing";
    expect(() => resolve(value)).toThrow(/definition family/);
  });

  it.each([
    "scientific.communication",
    "scientific.communication-terms",
    "scientific.communication-resolution",
    "scientific.claim",
    "scientific.synthesis",
    "petra.communication-invocation-view",
  ])("rejects missing %s registration", (key) => {
    const value = definition();
    value.content.registrations = value.content.registrations.filter(
      (entry) => entry.semantic_key !== key,
    ) as typeof value.content.registrations;
    expect(() => resolve(seal(value))).toThrow(/missing or incompatible/);
  });

  it.each(["name", "version", "content_hash", "registration_kind"] as const)(
    "rejects incompatible validator %s",
    (key) => {
      const value = definition();
      const entry = value.content.registrations.find(
        (entry) => entry.registration_kind === "validator",
      )!;
      if (key === "registration_kind") entry.registration_kind = "output";
      else
        entry.contract[key] =
          key === "content_hash"
            ? `sha256:${"b".repeat(64)}`
            : key === "version"
              ? "2.0.0"
              : "petra.unknown-validator";
      expect(() => resolve(seal(value))).toThrow(/missing or incompatible/);
    },
  );

  it.each(["scientific-communication-payload", "claim"])(
    "rejects missing installed %s",
    (name) => {
      const value = definition();
      const entries = contracts.entries;
      vi.spyOn(contracts, "entries", "get").mockReturnValue(
        entries.filter((entry) => entry.name !== name),
      );
      expect(() => resolve(value)).toThrow(/not installed/);
    },
  );

  it("rejects a missing installed validator despite intact registration metadata", () => {
    const value = definition();
    const original = contracts.validator.bind(contracts);
    vi.spyOn(contracts, "validator").mockImplementation((name, version) => {
      if (name === "claim") throw new Error("Unavailable implementation");
      return original(name, version);
    });
    expect(() => resolve(value)).toThrow(/no available schema validator/);
  });

  it("rejects a validator unable to check the installed payload", () => {
    const value = definition();
    const original = contracts.assertValid.bind(contracts);
    vi.spyOn(contracts, "assertValid").mockImplementation(
      (name, version, input) => {
        if (name === "scientific-communication-payload")
          throw new Error("Incompatible validator");
        original(name, version, input);
      },
    );
    expect(() => resolve(value)).toThrow(/cannot validate/);
  });

  it.each(["fr", "en-US", ""])(
    "fails closed for unregistered locale %s",
    (locale) => {
      expect(() => resolve(definition(), locale)).toThrow(
        /English terminology/,
      );
    },
  );

  it("keeps exact identity and equivalent first, later, and textual references", () => {
    const result = describeReference();
    expect(result.state).toBe("resolved");
    expect(result.reference).toEqual(reference);
    expect(result.first_reference).toBe(
      `Claim ${reference.canonical_id} (revision 2)`,
    );
    expect(result.later_reference).toBe(result.first_reference);
    expect(result.text_alternative).toBe(result.first_reference);
    expect(result.limitations).toEqual([]);
  });

  it.each(["missing", "borrowed", "wrong_family"])(
    "uses visible generic fallback for %s display terminology",
    (mode) => {
      const value = definition();
      const term = value.content.terms.find(
        (term) => term.semantic_key === reference.semantic_key,
      )!;
      if (mode === "missing") term.semantic_key = "unrelated.term";
      if (mode === "borrowed") term.singular = "Scene";
      if (mode === "wrong_family") term.generic_family = "focus";
      const result = describeReference(seal(value));
      expect(result.state).toBe("generic_fallback");
      expect(result.first_reference).toBe(
        `finding ${reference.canonical_id} (revision 2)`,
      );
      expect(result.limitations).toHaveLength(1);
      expect(result.response_language_validation).toBe("not_performed");
      expect(result.first_reference).not.toContain("Scene");
    },
  );

  it("cannot use generic fallback for unknown semantics", () => {
    expect(() =>
      describeReference(definition(), {
        ...reference,
        semantic_key: "writing.scene",
      }),
    ).toThrow(/No installed communication reference owner/);
  });

  it.each(["registration", "term"])(
    "rejects ambiguous %s even with matching labels",
    (kind) => {
      const value = definition();
      if (kind === "registration")
        value.content.registrations.push(
          structuredClone(value.content.registrations[1]!),
        );
      else value.content.terms.push(structuredClone(value.content.terms[1]));
      expect(() => describeReference(seal(value))).toThrow(/duplicate/);
    },
  );

  it("disambiguates identical labels with full canonical identity and revision", () => {
    const first = describeReference();
    const second = describeReference(definition(), {
      ...reference,
      canonical_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FBC",
    });
    const revision = describeReference(definition(), {
      ...reference,
      revision: 3,
    });
    expect(
      new Set([
        first.first_reference,
        second.first_reference,
        revision.first_reference,
      ]).size,
    ).toBe(3);
  });

  it.each([
    { ...reference, canonical_id: "work_01ARZ3NDEKTSV4RRFFQ69G5FBB" },
    { ...reference, canonical_id: "Claim 1" },
    { ...reference, revision: 0 },
    { ...reference, content_hash: "sha256:wrong" },
    { ...reference, source_language: " " },
  ])("rejects malformed or mismatched reference %#", (ref) => {
    expect(() => describeReference(definition(), ref)).toThrow(
      /canonical identity/,
    );
  });

  it("preserves the immutable SourceSpan revision instead of inventing a later revision", () => {
    const span = {
      ...reference,
      semantic_key: "scientific.source-span",
      canonical_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FBB",
      revision: 1,
    };
    expect(describeReference(definition(), span).reference).toEqual(span);
    expect(() =>
      describeReference(definition(), { ...span, revision: 2 }),
    ).toThrow(/canonical identity/);
  });

  it("retains historical descriptors separately from current fallback and source-time evidence", () => {
    const historical = definition();
    const original = describeReference(historical);
    const current = structuredClone(historical);
    current.revision += 1;
    current.content.terms[1].singular = "Uninstalled replacement";
    const replacement = describeReference(seal(current));
    expect(original.state).toBe("resolved");
    expect(replacement.state).toBe("generic_fallback");
    expect(original.definition.revision).toBe(1);
    expect(replacement.definition.revision).toBe(2);
    expect(describeReference(historical)).toEqual(original);
    expect(resolve(historical).source_time_versions).toBe(
      "not_observed_by_resolver",
    );
  });

  it("does not substitute an unknown current payload version for historical resolution", () => {
    const historical = definition();
    const original = resolve(historical);
    const current = structuredClone(historical);
    current.revision += 1;
    const registration = current.content.registrations.find(
      (entry) => entry.semantic_key === "scientific.communication",
    )!;
    registration.contract.version = "2.0.0";
    expect(() => resolve(seal(current))).toThrow(/missing or incompatible/);
    expect(resolve(historical)).toEqual(original);
  });

  it.each(["fr", null])(
    "retains source language %s without translation claims",
    (language) => {
      const result = describeReference(definition(), {
        ...reference,
        source_language: language,
      });
      expect(result.reference.source_language).toBe(language);
      expect(result.source_language_coverage).toBe(
        "original_language_retained_without_translation_validation",
      );
    },
  );

  it("repeated resolution is stable and returned objects cannot mutate future resolution", () => {
    const value = definition();
    const expected = resolve(value);
    const result = resolve(value);
    result.payload.profile.preservation.pop();
    result.definition.revision = 99;
    expect(resolve(value)).toEqual(expected);
    expect(describeReference(value)).toEqual(describeReference(value));
  });

  it("retains action and validation owner limits without granting recovery or language approval", () => {
    const profile = resolve().payload.profile;
    expect(profile.action_report.rules.retry_exact_start).toBe(
      "before_work_registration_only_never_terminal_failed_work",
    );
    expect(profile.action_report.rules.work).toBe(
      "execution_state_and_terminal_outcome_separate",
    );
    expect(profile.action_report.rules.history).toContain("bounded_at_100");
    expect(profile.validation.response_language_receipt).toBe(
      "not_implemented",
    );
    expect(profile.validation.draft_felicity_receipt).toBe(
      "not_applicable_to_response",
    );
    expect(profile.validation.scope).toBe(
      "profile_registration_and_reference_resolution_only",
    );
  });
});
