import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import claimSchema from "../../../../packages/contracts/schemas/claim/1.0.0/schema.json";
import commandEnvelopeSchema from "../../../../packages/contracts/schemas/command-envelope/1.0.0/schema.json";
import commandEnvelopeV18Schema from "../../../../packages/contracts/schemas/command-envelope/1.8.0/schema.json";
import commonSchema from "../../../../packages/contracts/schemas/common/1.0.0/schema.json";
import correctionReceiptSchema from "../../../../packages/contracts/schemas/review-candidate-correction-receipt/1.0.0/schema.json";
import basisRevisionReceiptSchema from "../../../../packages/contracts/schemas/review-candidate-basis-revision-receipt/1.0.0/schema.json";
import refreshReceiptSchema from "../../../../packages/contracts/schemas/review-session-refresh-receipt/1.0.0/schema.json";
import separationReceiptSchema from "../../../../packages/contracts/schemas/review-session-separation-receipt/1.0.0/schema.json";
import reviewSessionSchema from "../../../../packages/contracts/schemas/review-session/1.0.0/schema.json";
import reviewSessionV11Schema from "../../../../packages/contracts/schemas/review-session/1.1.0/schema.json";
import workingCandidateSchema from "../../../../packages/contracts/schemas/working-candidate/1.0.0/schema.json";
import workingRelationshipSchema from "../../../../packages/contracts/schemas/working-relationship/1.0.0/schema.json";

type BrowserContractName =
  | "claim@1.0.0"
  | "review-candidate-basis-revision-receipt@1.0.0"
  | "review-candidate-correction-receipt@1.0.0"
  | "review-session-separation-receipt@1.0.0"
  | "review-session@1.1.0"
  | "working-candidate@1.0.0"
  | "working-relationship@1.0.0";

const definitionDependency = <
  Schema extends {
    readonly $schema: string;
    readonly $id: string;
    readonly $defs: object;
  },
>(
  schema: Schema,
): Pick<Schema, "$schema" | "$id" | "$defs"> => ({
  $schema: schema.$schema,
  $id: schema.$id,
  $defs: schema.$defs,
});

const schemas = [
  commonSchema,
  definitionDependency(commandEnvelopeSchema),
  definitionDependency(commandEnvelopeV18Schema),
  claimSchema,
  workingCandidateSchema,
  workingRelationshipSchema,
  definitionDependency(reviewSessionSchema),
  definitionDependency(refreshReceiptSchema),
  reviewSessionV11Schema,
  correctionReceiptSchema,
  basisRevisionReceiptSchema,
  separationReceiptSchema,
] as const;

const contractIds: Record<BrowserContractName, string> = {
  "claim@1.0.0": claimSchema.$id,
  "review-candidate-basis-revision-receipt@1.0.0":
    basisRevisionReceiptSchema.$id,
  "review-candidate-correction-receipt@1.0.0": correctionReceiptSchema.$id,
  "review-session-separation-receipt@1.0.0": separationReceiptSchema.$id,
  "review-session@1.1.0": reviewSessionV11Schema.$id,
  "working-candidate@1.0.0": workingCandidateSchema.$id,
  "working-relationship@1.0.0": workingRelationshipSchema.$id,
};

export class ContractRegistryError extends Error {
  readonly validationErrors: readonly unknown[];

  constructor(message: string, validationErrors: readonly unknown[] = []) {
    super(message);
    this.name = "ContractRegistryError";
    this.validationErrors = validationErrors;
  }
}

/**
 * Browser-only validator for the exact response contracts consumed by the
 * Review candidate correction, basis-revision, and member-separation clients.
 * Vite aliases the Node filesystem-backed registry to this bundled schema set;
 * server and package consumers keep the canonical registry implementation.
 */
export class PetraContractRegistry {
  readonly #validators = new Map<BrowserContractName, ValidateFunction>();

  constructor() {
    const ajv = new Ajv2020({
      allErrors: true,
      coerceTypes: false,
      removeAdditional: false,
      strict: true,
      useDefaults: false,
    });
    addFormats(ajv, { formats: ["date", "date-time", "uri"] });
    for (const schema of schemas) ajv.addSchema(schema);
    for (const [key, id] of Object.entries(contractIds)) {
      const validator = ajv.getSchema(id);
      if (validator === undefined) {
        throw new ContractRegistryError(
          `The browser contract validator is missing ${key}.`,
        );
      }
      this.#validators.set(key as BrowserContractName, validator);
    }
  }

  assertValid(name: string, version: string, value: unknown): void {
    const key = `${name}@${version}` as BrowserContractName;
    const validator = this.#validators.get(key);
    if (validator === undefined) {
      throw new ContractRegistryError(
        `The browser contract validator does not register ${key}.`,
      );
    }
    if (!validator(value)) {
      throw new ContractRegistryError(
        `The value does not satisfy ${key}.`,
        validator.errors ?? [],
      );
    }
  }
}
