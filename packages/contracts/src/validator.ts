import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Ajv2020,
  type AnySchema,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import formatsPackage from "ajv-formats";
import { canonicalize } from "json-canonicalize";

export const PETRA_FORMAT_ALLOWLIST = ["date", "date-time", "uri"] as const;

export type PetraFormat = (typeof PETRA_FORMAT_ALLOWLIST)[number];

export type ContractRegistryErrorCode =
  | "CONTRACT_REGISTRY_INVALID"
  | "CONTRACT_SCHEMA_NOT_REGISTERED"
  | "CONTRACT_SCHEMA_PROFILE_INVALID"
  | "CONTRACT_VALUE_INVALID";

export class ContractRegistryError extends Error {
  readonly code: ContractRegistryErrorCode;
  readonly validationErrors: readonly ErrorObject[];

  constructor(
    code: ContractRegistryErrorCode,
    message: string,
    validationErrors: readonly ErrorObject[] = [],
  ) {
    super(message);
    this.name = "ContractRegistryError";
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

export interface ContractRegistryEntry {
  name: string;
  version: string;
  $id: string;
  path: string;
  status: "accepted";
  compatibility: string;
  canonical_sha256: string;
  generate_typescript: boolean;
  typescript_path?: string;
}

interface ContractRegistryDocument {
  registry_version: string;
  schemas: ContractRegistryEntry[];
}

interface SchemaObject {
  $schema?: unknown;
  $id?: unknown;
  title?: unknown;
  [key: string]: unknown;
}

const DEFAULT_PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const allowedFormats = new Set<string>(PETRA_FORMAT_ALLOWLIST);
const addFormats = formatsPackage.default;

const registryKey = (name: string, version: string): string =>
  `${name}@${version}`;

const parseJson = <Value>(path: string): Value =>
  JSON.parse(readFileSync(path, "utf8")) as Value;

const schemaDigest = (schema: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(schema)).digest("hex")}`;

const visitSchema = (
  value: unknown,
  visitor: (member: SchemaObject) => void,
): void => {
  if (Array.isArray(value)) {
    for (const member of value) visitSchema(member, visitor);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const member = value as SchemaObject;
  visitor(member);
  for (const child of Object.values(member)) visitSchema(child, visitor);
};

const documentId = (reference: string, baseId: string): string => {
  const resolved = new URL(reference, baseId);
  resolved.hash = "";
  return resolved.href;
};

export function assertPortableSchema(
  schema: unknown,
  registeredIds: ReadonlySet<string>,
): asserts schema is AnySchema {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new ContractRegistryError(
      "CONTRACT_SCHEMA_PROFILE_INVALID",
      "A canonical Petra schema must be a JSON object.",
    );
  }
  const root = schema as SchemaObject;
  if (
    root.$schema !== DRAFT_2020_12 ||
    typeof root.$id !== "string" ||
    typeof root.title !== "string" ||
    root.title.length === 0
  ) {
    throw new ContractRegistryError(
      "CONTRACT_SCHEMA_PROFILE_INVALID",
      "A canonical Petra schema must declare Draft 2020-12, an immutable $id, and a title.",
    );
  }
  const rootId = root.$id;
  visitSchema(root, (member) => {
    if (
      typeof member.format === "string" &&
      !allowedFormats.has(member.format)
    ) {
      throw new ContractRegistryError(
        "CONTRACT_SCHEMA_PROFILE_INVALID",
        `Schema ${rootId} uses unregistered format ${String(member.format)}.`,
      );
    }
    if (typeof member.$ref === "string") {
      const targetId = documentId(member.$ref, rootId);
      if (!registeredIds.has(targetId)) {
        throw new ContractRegistryError(
          "CONTRACT_SCHEMA_PROFILE_INVALID",
          `Schema ${rootId} resolves $ref ${member.$ref} outside the local Petra registry.`,
        );
      }
    }
  });
}

export class PetraContractRegistry {
  readonly #ajv: Ajv2020;
  readonly #entries: ReadonlyMap<string, ContractRegistryEntry>;

  constructor(packageRoot: string = DEFAULT_PACKAGE_ROOT) {
    const registry = parseJson<ContractRegistryDocument>(
      resolve(packageRoot, "registry.json"),
    );
    if (
      typeof registry.registry_version !== "string" ||
      !Array.isArray(registry.schemas)
    ) {
      throw new ContractRegistryError(
        "CONTRACT_REGISTRY_INVALID",
        "The Petra schema registry has an invalid root shape.",
      );
    }
    const entries = new Map<string, ContractRegistryEntry>();
    const registeredIds = new Set(registry.schemas.map((entry) => entry.$id));
    if (registeredIds.size !== registry.schemas.length) {
      throw new ContractRegistryError(
        "CONTRACT_REGISTRY_INVALID",
        "Canonical schema $ids must be unique.",
      );
    }
    const ajv = new Ajv2020({
      allErrors: true,
      coerceTypes: false,
      removeAdditional: false,
      strict: true,
      useDefaults: false,
    });
    addFormats(ajv, { formats: [...PETRA_FORMAT_ALLOWLIST] });

    const loaded: Array<{
      entry: ContractRegistryEntry;
      schema: AnySchema;
    }> = [];
    for (const entry of registry.schemas) {
      const key = registryKey(entry.name, entry.version);
      if (entries.has(key)) {
        throw new ContractRegistryError(
          "CONTRACT_REGISTRY_INVALID",
          `Duplicate canonical schema identity ${key}.`,
        );
      }
      const schema = parseJson<unknown>(resolve(packageRoot, entry.path));
      assertPortableSchema(schema, registeredIds);
      if (
        (schema as SchemaObject).$id !== entry.$id ||
        schemaDigest(schema) !== entry.canonical_sha256
      ) {
        throw new ContractRegistryError(
          "CONTRACT_REGISTRY_INVALID",
          `Canonical schema ${key} does not match its accepted registry identity.`,
        );
      }
      entries.set(key, Object.freeze(structuredClone(entry)));
      loaded.push({ entry, schema });
    }
    for (const value of loaded) ajv.addSchema(value.schema, value.entry.$id);
    this.#ajv = ajv;
    this.#entries = entries;
  }

  get entries(): readonly ContractRegistryEntry[] {
    return [...this.#entries.values()];
  }

  has(name: string, version: string): boolean {
    return this.#entries.has(registryKey(name, version));
  }

  validator(name: string, version: string): ValidateFunction {
    const entry = this.#entries.get(registryKey(name, version));
    if (entry === undefined) {
      throw new ContractRegistryError(
        "CONTRACT_SCHEMA_NOT_REGISTERED",
        `Contract ${name}@${version} is not registered.`,
      );
    }
    const validate = this.#ajv.getSchema(entry.$id);
    if (validate === undefined) {
      throw new ContractRegistryError(
        "CONTRACT_REGISTRY_INVALID",
        `Contract ${name}@${version} was registered but not compiled.`,
      );
    }
    return validate;
  }

  isValid(name: string, version: string, value: unknown): boolean {
    return this.validator(name, version)(value) === true;
  }

  assertValid(name: string, version: string, value: unknown): void {
    const validate = this.validator(name, version);
    if (!validate(value)) {
      throw new ContractRegistryError(
        "CONTRACT_VALUE_INVALID",
        `Value does not satisfy ${name}@${version}.`,
        structuredClone(validate.errors ?? []),
      );
    }
  }
}
