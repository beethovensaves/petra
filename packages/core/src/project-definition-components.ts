import type { PetraProjectDefinition } from "@petra/contracts";

type Registration = PetraProjectDefinition["content"]["registrations"][number];
export type DefinitionBinding = {
  projectId: string;
  definitionId: string;
  revision: number;
  contentHash: string;
};
export type InstalledDefinitionComponent = {
  kind: Registration["registration_kind"];
  contract: Registration["contract"];
  componentId: string;
  capability: "examine" | "execute" | "describe";
};
export type ResolvedDefinitionComponent = {
  registration: Registration;
  label: string;
  description: string;
  schema: "installed" | "unavailable";
  components: readonly InstalledDefinitionComponent[];
  limitation?: string;
};
export type ProjectDefinitionComponents = {
  binding: DefinitionBinding;
  label: string;
  description: string;
  authority: "none";
  registrations: readonly ResolvedDefinitionComponent[];
  terms: PetraProjectDefinition["content"]["terms"];
  places: PetraProjectDefinition["content"]["supported_places"];
  omittedFlows: readonly string[];
};
const sameContract = (
  a: Registration["contract"],
  b: Registration["contract"],
): boolean =>
  a.name === b.name &&
  a.version === b.version &&
  a.content_hash === b.content_hash;

/** Takes an integrity-checked, authorized definition. No template or family
 * lookup, command port, or authority state enters component negotiation. Schema
 * admission and an installed examiner/executor are deliberately separate. */
export function resolveProjectDefinitionComponents(
  definition: PetraProjectDefinition,
  expected: DefinitionBinding,
  schemas: readonly {
    name: string;
    version: string;
    canonical_sha256: string;
  }[],
  installed: readonly InstalledDefinitionComponent[],
): ProjectDefinitionComponents {
  if (
    definition.project_id !== expected.projectId ||
    definition.project_definition_id !== expected.definitionId ||
    definition.revision !== expected.revision ||
    definition.content_hash !== expected.contentHash
  )
    throw new Error(
      "The exact ProjectDefinition binding is unavailable; substitution is forbidden.",
    );
  const registrations = definition.content.registrations;
  const keys = registrations.map(
    (r) => `${r.registration_kind}:${r.semantic_key}`,
  );
  const termKeys = definition.content.terms.map((t) => t.semantic_key);
  if (
    new Set(keys).size !== keys.length ||
    new Set(termKeys).size !== termKeys.length
  )
    throw new Error(
      "Definition registrations and terminology must be unambiguous.",
    );
  const components = registrations.map(
    (registration): ResolvedDefinitionComponent => {
      const term = definition.content.terms.find(
        (t) => t.semantic_key === registration.semantic_key,
      );
      const schemaInstalled = schemas.some(
        (s) =>
          `petra.${s.name}` === registration.contract.name &&
          s.version === registration.contract.version &&
          s.canonical_sha256 === registration.contract.content_hash,
      );
      const resolved = schemaInstalled
        ? installed.filter(
            (c) =>
              c.kind === registration.registration_kind &&
              sameContract(c.contract, registration.contract),
          )
        : [];
      const ambiguous = new Set(
        resolved
          .filter(
            (c) =>
              resolved.filter((other) => other.capability === c.capability)
                .length > 1,
          )
          .map((c) => c.capability),
      );
      const unambiguous = resolved.filter((c) => !ambiguous.has(c.capability));
      return {
        registration: structuredClone(registration),
        label: term?.singular ?? registration.semantic_key,
        description:
          term?.definition ?? "An exact registered Project capability.",
        schema: schemaInstalled ? "installed" : "unavailable",
        components: structuredClone(unambiguous),
        ...(!schemaInstalled
          ? {
              limitation: `The exact ${registration.contract.name} version ${registration.contract.version} and content hash are unavailable.`,
            }
          : ambiguous.size > 0
            ? {
                limitation: `The installed ${[...ambiguous].join(", ")} capability is ambiguous; no component was selected for it.`,
              }
            : resolved.length === 0
              ? {
                  limitation: `The ${registration.registration_kind.replaceAll("_", " ")} contract is installed; no component implements this capability in this runtime.`,
                }
              : {}),
      };
    },
  );
  return {
    binding: { ...expected },
    label: definition.content.label,
    description: definition.content.description,
    authority: "none",
    registrations: components,
    terms: structuredClone(definition.content.terms),
    places: structuredClone(definition.content.supported_places),
    omittedFlows: [...definition.content.omitted_flows],
  };
}

/** Retained material must remain on its own interpretation. A newer definition
 * never supplies an examiner or execution capability to an older record. */
export function resolveNativeDefinitionComponent(
  resolved: ProjectDefinitionComponents,
  material: {
    projectId: string;
    definition: DefinitionBinding;
    semanticKey: string;
    schemaName: string;
    schemaVersion: string;
    kind: "object_schema" | "relationship_schema";
  },
): ResolvedDefinitionComponent | undefined {
  const a = resolved.binding,
    b = material.definition;
  if (
    material.projectId !== a.projectId ||
    b.projectId !== a.projectId ||
    b.definitionId !== a.definitionId ||
    b.revision !== a.revision ||
    b.contentHash !== a.contentHash
  )
    return undefined;
  return resolved.registrations.find(
    ({ registration: r, schema }) =>
      schema === "installed" &&
      r.registration_kind === material.kind &&
      r.semantic_key === material.semanticKey &&
      r.contract.name === material.schemaName &&
      r.contract.version === material.schemaVersion,
  );
}
