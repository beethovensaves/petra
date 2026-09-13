import { createHash } from "node:crypto";

import {
  type PetraProjectDefinition,
  type PetraScientificCommunicationPayload,
  type ProjectDefinitionContractRef,
  type ProjectDefinitionRegistration,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import { parsePetraId } from "./identity.js";

const NAME = "scientific-communication-payload";
const VERSION = "1.0.0";
type Profile = PetraScientificCommunicationPayload["profile"];

export interface CommunicationDefinitionBinding {
  project_id: string;
  project_definition_id: string;
  revision: number;
  content_hash: string;
}

export interface CommunicationReferenceRequest {
  semantic_key: string;
  canonical_id: string;
  revision: number;
  content_hash: string;
  /** Observed source language, not an inference from the requested locale. */
  source_language: string | null;
}

export class ProfileCommunicationError extends Error {
  constructor(
    readonly code:
      | "COMMUNICATION_DEFINITION_MISMATCH"
      | "COMMUNICATION_REGISTRATION_UNSUPPORTED"
      | "COMMUNICATION_REGISTRATION_AMBIGUOUS"
      | "COMMUNICATION_VALIDATOR_UNAVAILABLE"
      | "COMMUNICATION_LOCALE_UNSUPPORTED"
      | "COMMUNICATION_REFERENCE_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "ProfileCommunicationError";
  }
}

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const sameContract = (
  left: ProjectDefinitionContractRef,
  right: ProjectDefinitionContractRef,
): boolean =>
  left.name === right.name &&
  left.version === right.version &&
  left.content_hash === right.content_hash;

/**
 * A pure prerequisite over an exact, already-authorized definition read. This
 * does not read Project authority, validate response language, or compose a plan.
 * Only the installed immutable schema supplies the non-executable payload.
 */
export class ProfileCommunicationResolver {
  constructor(private readonly contracts: PetraContractRegistry) {}

  private installed(ref: ProjectDefinitionContractRef): void {
    const entry = this.contracts.entries.find(
      (entry) =>
        `petra.${entry.name}` === ref.name && entry.version === ref.version,
    );
    if (entry === undefined || entry.canonical_sha256 !== ref.content_hash)
      throw new ProfileCommunicationError(
        "COMMUNICATION_REGISTRATION_UNSUPPORTED",
        "The exact communication semantic contract is not installed.",
      );
    try {
      this.contracts.validator(entry.name, entry.version);
    } catch {
      throw new ProfileCommunicationError(
        "COMMUNICATION_VALIDATOR_UNAVAILABLE",
        "The installed communication dependency has no available schema validator.",
      );
    }
  }

  /** Required registrations for a separately authored definition revision. No opt-in write. */
  requiredRegistrations(): ProjectDefinitionRegistration[] {
    const { profile, contract } = this.load();
    return structuredClone([
      {
        registration_kind: "extension",
        semantic_key: "scientific.communication",
        contract,
      },
      {
        registration_kind: "terminology",
        semantic_key: "scientific.communication-terms",
        contract,
      },
      {
        registration_kind: "validator",
        semantic_key: "scientific.communication-resolution",
        contract,
      },
      {
        registration_kind: "output",
        semantic_key: "scientific.synthesis",
        contract: profile.response_schema,
      },
      {
        registration_kind: "extension",
        semantic_key: "petra.communication-invocation",
        contract: profile.action_report.invocation_schema,
      },
      {
        registration_kind: "extension",
        semantic_key: "petra.communication-invocation-view",
        contract: profile.action_report.invocation_view_schema,
      },
      {
        registration_kind: "extension",
        semantic_key: "petra.communication-work",
        contract: profile.action_report.work_schema,
      },
      ...profile.reference_owners.map(
        ({ semantic_key, registration_kind, contract }) => ({
          semantic_key,
          registration_kind,
          contract,
        }),
      ),
    ]);
  }

  private load(): { profile: Profile; contract: ProjectDefinitionContractRef } {
    const entry = this.contracts.entries.find(
      (entry) => entry.name === NAME && entry.version === VERSION,
    );
    if (entry === undefined)
      throw new ProfileCommunicationError(
        "COMMUNICATION_REGISTRATION_UNSUPPORTED",
        "The scientific communication payload is not installed.",
      );
    const contract = {
      name: `petra.${NAME}`,
      version: VERSION,
      content_hash: entry.canonical_sha256,
    };
    this.installed(contract);
    // The registry verifies canonical schema hashes before compiling validators.
    // This singleton payload's const is the versioned semantic data, not defaults
    // copied from an untrusted request or mutable ProjectDefinition term list.
    const schema = this.contracts.validator(NAME, VERSION).schema as {
      properties: { profile: { const: Profile } };
    };
    const profile = structuredClone(schema.properties.profile.const);
    try {
      this.contracts.assertValid(NAME, VERSION, {
        schema_name: `petra.${NAME}`,
        schema_version: VERSION,
        profile,
      });
    } catch {
      throw new ProfileCommunicationError(
        "COMMUNICATION_VALIDATOR_UNAVAILABLE",
        "The installed validator cannot validate its exact communication payload.",
      );
    }
    return { profile, contract };
  }

  resolve(
    definition: PetraProjectDefinition,
    expected: CommunicationDefinitionBinding,
    locale: string,
  ) {
    this.contracts.assertValid("project-definition", "1.0.0", definition);
    if (
      definition.project_id !== expected.project_id ||
      definition.project_definition_id !== expected.project_definition_id ||
      definition.revision !== expected.revision ||
      definition.content_hash !== expected.content_hash ||
      digest(definition.content) !== definition.content_hash
    )
      throw new ProfileCommunicationError(
        "COMMUNICATION_DEFINITION_MISMATCH",
        "Communication requires the exact Project-owned definition revision and content hash.",
      );
    const { profile, contract } = this.load();
    if (definition.definition_family !== profile.definition_family)
      throw new ProfileCommunicationError(
        "COMMUNICATION_REGISTRATION_UNSUPPORTED",
        "No installed communication payload supports this definition family.",
      );
    if (locale !== "en")
      throw new ProfileCommunicationError(
        "COMMUNICATION_LOCALE_UNSUPPORTED",
        "This communication payload covers English terminology and reference rules only.",
      );
    for (const required of this.requiredRegistrations()) {
      const matches = definition.content.registrations.filter(
        (entry) => entry.semantic_key === required.semantic_key,
      );
      if (matches.length > 1)
        throw new ProfileCommunicationError(
          "COMMUNICATION_REGISTRATION_AMBIGUOUS",
          "Communication cannot choose between duplicate semantic registrations.",
        );
      const actual = matches[0];
      if (
        actual === undefined ||
        actual.registration_kind !== required.registration_kind ||
        !sameContract(actual.contract, required.contract)
      )
        throw new ProfileCommunicationError(
          "COMMUNICATION_REGISTRATION_UNSUPPORTED",
          `The exact ${required.semantic_key} registration is missing or incompatible.`,
        );
      this.installed(actual.contract);
    }
    return {
      state: "resolved" as const,
      definition: structuredClone(expected),
      locale: "en" as const,
      composition_contract: contract,
      payload: {
        schema_name: `petra.${NAME}` as const,
        schema_version: VERSION,
        profile,
      },
      validation_scope: profile.validation.scope,
      response_language_validation: "not_performed" as const,
      source_time_versions: "not_observed_by_resolver" as const,
    };
  }

  /** No reference lookup or permission claim: the caller supplies an exact observed identity. */
  resolveReference(
    definition: PetraProjectDefinition,
    expected: CommunicationDefinitionBinding,
    locale: string,
    reference: CommunicationReferenceRequest,
  ) {
    const resolution = this.resolve(definition, expected, locale);
    const owner = resolution.payload.profile.reference_owners.find(
      (owner) => owner.semantic_key === reference.semantic_key,
    );
    if (owner === undefined)
      throw new ProfileCommunicationError(
        "COMMUNICATION_REGISTRATION_UNSUPPORTED",
        "No installed communication reference owner has this semantic key.",
      );
    try {
      parsePetraId(reference.canonical_id, owner.canonical_kind);
      if (
        !Number.isSafeInteger(reference.revision) ||
        reference.revision < 1 ||
        (owner.revision_policy === "immutable_revision_one" &&
          reference.revision !== 1) ||
        !/^sha256:[a-f0-9]{64}$/.test(reference.content_hash) ||
        (reference.source_language !== null &&
          reference.source_language.trim().length === 0)
      )
        throw new Error("Invalid reference.");
    } catch {
      throw new ProfileCommunicationError(
        "COMMUNICATION_REFERENCE_INVALID",
        "Communication requires a canonical identity, revision, hash, and explicit source language or unavailability.",
      );
    }
    const terms = definition.content.terms.filter(
      (term) => term.semantic_key === owner.semantic_key,
    );
    if (terms.length > 1)
      throw new ProfileCommunicationError(
        "COMMUNICATION_REGISTRATION_AMBIGUOUS",
        "Communication cannot choose between duplicate display terms.",
      );
    const term = terms[0];
    const supportedTerm =
      term !== undefined &&
      term.generic_family === owner.generic_family &&
      term.singular === owner.singular &&
      term.plural === owner.plural;
    const label = supportedTerm ? owner.singular : owner.generic_family;
    const text = `${label} ${reference.canonical_id} (revision ${reference.revision})`;
    return {
      state: supportedTerm
        ? ("resolved" as const)
        : ("generic_fallback" as const),
      definition: resolution.definition,
      terminology_contract: resolution.composition_contract,
      reference: structuredClone(reference),
      semantic_owner: structuredClone(owner.contract),
      first_reference: text,
      later_reference: text,
      text_alternative: text,
      limitations: supportedTerm
        ? []
        : [
            "The display term is missing or incompatible. The registered generic family and exact canonical identity are retained.",
          ],
      source_language_coverage:
        reference.source_language === "en"
          ? ("registered_english_terms_only" as const)
          : ("original_language_retained_without_translation_validation" as const),
      response_language_validation: "not_performed" as const,
    };
  }
}
