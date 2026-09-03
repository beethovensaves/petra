import type { LocalModelRevisionResolver } from "./local-openai-compatible-extractor.js";

export interface DockerModelRunnerInspectResult {
  readonly id: string;
  readonly tags: readonly string[];
  readonly created: number;
  readonly config: Readonly<Record<string, unknown>>;
}

export interface DockerModelRunnerInspector {
  readonly inspect: (modelReference: string) => Promise<unknown>;
}

export interface DockerModelRunnerConfiguration {
  readonly Backend: string;
  readonly Model: string;
  readonly ModelID: string;
  readonly Mode: string;
  readonly Config: Readonly<Record<string, unknown>>;
}

const digestPattern = /^sha256:[a-f0-9]{64}$/;

export const parseDockerModelRunnerInspection = (
  value: unknown,
): DockerModelRunnerInspectResult => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Docker Model Runner inspection was not a JSON object.");
  }
  const member = value as Record<string, unknown>;
  if (typeof member.id !== "string" || !digestPattern.test(member.id)) {
    throw new Error(
      "Docker Model Runner inspection did not expose an immutable sha256 model digest.",
    );
  }
  if (
    !Array.isArray(member.tags) ||
    member.tags.some((tag) => typeof tag !== "string")
  ) {
    throw new Error(
      "Docker Model Runner inspection did not expose model tags.",
    );
  }
  if (typeof member.created !== "number" || !Number.isFinite(member.created)) {
    throw new Error(
      "Docker Model Runner inspection did not expose a numeric creation value.",
    );
  }
  if (
    typeof member.config !== "object" ||
    member.config === null ||
    Array.isArray(member.config)
  ) {
    throw new Error(
      "Docker Model Runner inspection did not expose model configuration.",
    );
  }
  return {
    id: member.id,
    tags: [...(member.tags as string[])],
    created: member.created,
    config: structuredClone(member.config as Record<string, unknown>),
  };
};

export const resolveDockerModelRunnerConfiguration = (
  value: unknown,
  identity: {
    readonly modelReference: string;
    readonly modelId: string;
    readonly backend: string;
  },
): DockerModelRunnerConfiguration => {
  if (!Array.isArray(value)) {
    throw new Error("Docker Model Runner configuration was not a JSON array.");
  }
  const matches = value.filter((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const member = candidate as Record<string, unknown>;
    return (
      member.Model === identity.modelReference &&
      member.ModelID === identity.modelId &&
      member.Backend === identity.backend
    );
  });
  if (matches.length !== 1) {
    throw new Error(
      `Docker Model Runner exposed ${matches.length} configurations for ${identity.modelReference}, ${identity.modelId}, and ${identity.backend}.`,
    );
  }
  const member = matches[0] as Record<string, unknown>;
  if (typeof member.Mode !== "string" || member.Mode.length === 0) {
    throw new Error("Docker Model Runner configuration has no execution mode.");
  }
  if (
    typeof member.Config !== "object" ||
    member.Config === null ||
    Array.isArray(member.Config)
  ) {
    throw new Error("Docker Model Runner configuration has no Config object.");
  }
  return {
    Backend: identity.backend,
    Model: identity.modelReference,
    ModelID: identity.modelId,
    Mode: member.Mode,
    Config: structuredClone(member.Config as Record<string, unknown>),
  };
};

export class DockerModelRunnerRevisionResolver implements LocalModelRevisionResolver {
  readonly #inspector: DockerModelRunnerInspector;

  constructor(inspector: DockerModelRunnerInspector) {
    this.#inspector = inspector;
  }

  async resolve(providerModel: string): Promise<string> {
    const inspection = parseDockerModelRunnerInspection(
      await this.#inspector.inspect(providerModel),
    );
    if (!inspection.tags.includes(providerModel)) {
      throw new Error(
        `Docker Model Runner digest ${inspection.id} is not tagged as ${providerModel}.`,
      );
    }
    return inspection.id;
  }
}
