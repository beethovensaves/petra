/** This versioned presentation activity cannot authorize a domain write. */
export const COPILOT_ANSWER_ACTIVITY = "petra.copilot.answer@1.0.0";
/** Input manifests remain separately validated retained extensions. */
export function answerDisclosureRecord<T extends { input_manifest?: unknown }>(
  turn: T,
): Omit<T, "input_manifest"> {
  const value = { ...turn };
  delete value.input_manifest;
  return value;
}
export interface CopilotAnswerActivity {
  presentation_version: "1.0.0";
  project_id: string;
  thread_id: string;
  run_id: string;
  request_hash: string;
  context_hash: string;
  authority_effect: "none";
  phase: "running" | "restoring" | "answer_block";
  turn_hash?: string;
  block_index?: number;
}
export function assertAnswerActivity(
  value: unknown,
): asserts value is CopilotAnswerActivity {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Malformed copilot activity.");
  const v = value as Record<string, unknown>;
  const base = [
    "presentation_version",
    "project_id",
    "thread_id",
    "run_id",
    "request_hash",
    "context_hash",
    "authority_effect",
    "phase",
  ];
  const expected =
    v.phase === "answer_block" ? [...base, "turn_hash", "block_index"] : base;
  if (
    Object.keys(v).length !== expected.length ||
    expected.some((key) => !(key in v)) ||
    v.presentation_version !== "1.0.0" ||
    v.authority_effect !== "none" ||
    !["running", "restoring", "answer_block"].includes(String(v.phase))
  )
    throw new Error(
      "Unsupported copilot activity version, fields or authority.",
    );
  for (const [field, prefix] of [
    ["project_id", "project"],
    ["thread_id", "thread"],
    ["run_id", "run"],
  ])
    if (
      typeof v[field!] !== "string" ||
      !new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`, "u").test(
        v[field!] as string,
      )
    )
      throw new Error("Malformed activity identity.");
  for (const field of [
    "request_hash",
    "context_hash",
    ...(v.phase === "answer_block" ? ["turn_hash"] : []),
  ])
    if (
      typeof v[field] !== "string" ||
      !/^sha256:[a-f0-9]{64}$/u.test(v[field])
    )
      throw new Error("Malformed activity hash.");
  if (
    v.phase === "answer_block" &&
    (!Number.isInteger(v.block_index) ||
      (v.block_index as number) < 0 ||
      (v.block_index as number) > 31)
  )
    throw new Error("Invalid retained block index.");
}
