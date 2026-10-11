import { useEffect, useState } from "react";
import type { PetraProjectSemanticGraphView } from "@petra/contracts";
import {
  resolveProjectDefinitionComponents,
  type DefinitionBinding,
  type InstalledDefinitionComponent,
  type ProjectDefinitionComponents,
} from "@petra/core/project-definition-components";
import registry from "../../../../packages/contracts/registry.json";
import { getExactProjectDefinition } from "./project-data.js";

// Installation owns executable components. A definition can select an exact
// admitted contract, but cannot name arbitrary client code or grant authority.
const examinerInstallations = [
  ["object_schema", "claim", "scientific-claim"],
  ["relationship_schema", "assertion", "scientific-assertion"],
  ["object_schema", "controlled-writing-requirement", "writing-requirement"],
] as const;
export const installedNativeExaminers: readonly InstalledDefinitionComponent[] =
  examinerInstallations.map(([kind, name, componentId]) => {
    const schema = registry.schemas.find(
      (s) => s.name === name && s.version === "1.0.0",
    );
    if (schema === undefined)
      throw new Error(
        `The installed ${componentId} has no exact registered contract.`,
      );
    return {
      kind,
      componentId,
      capability: "examine",
      contract: {
        name: `petra.${schema.name}`,
        version: schema.version,
        content_hash: schema.canonical_sha256,
      },
    };
  });
type DefinitionRef = PetraProjectSemanticGraphView["content"]["definition_ref"];
type State =
  | { key: string; status: "ready"; value: ProjectDefinitionComponents }
  | { key: string; status: "unavailable"; reason: string };
export function useProjectDefinitionComponents(
  projectId: string,
  ref: DefinitionRef,
):
  | { status: "loading" }
  | { status: "ready"; value: ProjectDefinitionComponents }
  | { status: "unavailable"; reason: string } {
  const binding: DefinitionBinding = {
    projectId,
    definitionId: ref.record_id,
    revision: ref.revision,
    contentHash: ref.content_hash,
  };
  const key = JSON.stringify(binding);
  const [state, setState] = useState<State>();
  useEffect(() => {
    let current = true;
    void getExactProjectDefinition(binding)
      .then((definition) => {
        const value = resolveProjectDefinitionComponents(
          definition,
          binding,
          registry.schemas,
          installedNativeExaminers,
        );
        if (current) setState({ key, status: "ready", value });
      })
      .catch((error: unknown) => {
        if (current)
          setState({
            key,
            status: "unavailable",
            reason:
              error instanceof Error
                ? error.message
                : "The exact definition components are unavailable.",
          });
      });
    return () => {
      current = false;
    };
    // The full immutable binding owns both the request and displayed result.
  }, [key]);
  if (state?.key !== key) return { status: "loading" };
  return state;
}
export function ProjectDefinitionComponentsDisclosure({
  value,
}: {
  value: ProjectDefinitionComponents;
}): React.JSX.Element {
  return (
    <details className="project-definition-components">
      <summary>What this Project can examine</summary>
      <p>{value.description}</p>
      <ul>
        {value.registrations.map((item) => (
          <li
            key={`${item.registration.registration_kind}:${item.registration.semantic_key}`}
          >
            <strong>{item.label}</strong> ·{" "}
            {item.components.some((c) => c.capability === "examine")
              ? "Examination available"
              : "Registered meaning"}
            <p>{item.description}</p>
            {item.limitation === undefined ? null : <p>{item.limitation}</p>}
          </li>
        ))}
      </ul>
      {value.omittedFlows.length === 0 ? null : (
        <p>Unavailable flows: {value.omittedFlows.join("; ")}</p>
      )}
      <details>
        <summary>Inspect definition binding</summary>
        <p>
          {value.binding.definitionId} · revision {value.binding.revision}
        </p>
        <code>{value.binding.contentHash}</code>
      </details>
    </details>
  );
}
