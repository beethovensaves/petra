import { ProjectBriefClient } from "@petra/adapters";
import type { PetraProjectBriefReadView } from "@petra/contracts";
import type { ProjectBriefRequest } from "@petra/core/project-brief-view";
import { canonicalize } from "json-canonicalize";
import payloadV10 from "../../../../packages/contracts/schemas/research-brief-payload/1.0.0/schema.json";
import payloadV11 from "../../../../packages/contracts/schemas/research-brief-payload/1.1.0/schema.json";

/** Version dispatch selects an installed schema; the response never supplies its trusted hash. */
export const installedBriefPayloadHash = async (
  version: unknown,
): Promise<string> => {
  const schema =
    version === "1.0.0"
      ? payloadV10
      : version === "1.1.0"
        ? payloadV11
        : undefined;
  if (schema === undefined)
    throw new Error("This Project Brief version is unsupported.");
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(schema)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export const readProjectBrief = async (options: {
  projectId: string;
  baseUrl: string;
  token: string;
  signal: AbortSignal;
  request?: ProjectBriefRequest;
}): Promise<PetraProjectBriefReadView> => {
  const url = new URL(
    `/api/queries/projects/${encodeURIComponent(options.projectId)}/brief`,
    options.baseUrl,
  );
  for (const key of [
    "expected_snapshot_hash",
    "baseline_event_id",
    "baseline_record_hash",
  ] as const) {
    const value = options.request?.[key];
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${options.token}` },
    signal: options.signal,
  });
  if (!response.ok) {
    return new ProjectBriefClient({
      baseUrl: options.baseUrl,
      token: options.token,
      registeredProfileSchemaHash: await installedBriefPayloadHash("1.1.0"),
      fetch: () => Promise.resolve(response),
    }).read(options.projectId, options.request);
  }
  const envelope = (await response.clone().json()) as {
    schema_version?: unknown;
  } | null;
  const registeredProfileSchemaHash = await installedBriefPayloadHash(
    envelope?.schema_version,
  );
  // Reuse the one authenticated response after version dispatch. The typed client
  // validates the complete schema, installed hash, and canonical snapshot bindings.
  return new ProjectBriefClient({
    baseUrl: options.baseUrl,
    token: options.token,
    registeredProfileSchemaHash,
    fetch: () => Promise.resolve(response),
  }).read(options.projectId, options.request);
};
