import type { CopilotTurn } from "./project-copilot.js";
import type { ConversationOwnerBinding } from "./conversation-authority.js";

/** Read models: no command port and no domain authority. */
export interface CopilotPresentation {
  readonly projectId: string;
  readonly threadId: string;
  readonly runId: string;
  readonly phase:
    | "connecting"
    | "running"
    | "disclosing"
    | "completed"
    | "failed"
    | "cancelled"
    | "disconnected";
  readonly authority: "none";
  readonly activity: string;
  readonly blocks: readonly CopilotPresentationBlock[];
  readonly work?: {
    readonly ref: ConversationOwnerBinding["work_unit_ref"];
    readonly destination: string;
    readonly outcome: "completed" | "failed" | "cancelled";
  };
  readonly limitation?: string;
}
export interface CopilotPresentationBlock {
  readonly index: number;
  readonly kind: "source_report" | "inference" | "advice" | "question";
  readonly text: string;
  readonly citations: readonly {
    readonly key: string;
    readonly label: string;
    readonly destination: string;
  }[];
}
/** Native interaction delivery reports proposals; it never commits a command. */
export interface InteractionPresentation {
  readonly threadId: string;
  readonly runId: string;
  readonly phase: "running" | "completed" | "failed" | "awaiting_review";
  readonly authority: "none";
  readonly text: string;
  readonly activity?: { readonly label: string; readonly status: string };
  readonly work?: {
    readonly id: string;
    readonly revision: number;
    readonly status: string;
  };
  readonly proposal?: {
    readonly id: string;
    readonly tool: "petra.inspect_evidence" | "petra.review_changeset";
    readonly arguments: Readonly<Record<string, unknown>>;
  };
  readonly review?: {
    readonly interruptId: string;
    readonly changeSet: {
      readonly id: string;
      readonly revision: number;
      readonly contentHash: string;
    };
  };
  readonly limitation?: string;
}
export function presentRetainedBlock(
  turn: CopilotTurn,
  owner: ConversationOwnerBinding,
  index: number,
): CopilotPresentationBlock {
  if (
    turn.terminal?.state !== "completed" ||
    owner.actor_id !== turn.actor_id ||
    owner.project_id !== turn.project_id ||
    owner.protocol_thread_id !== turn.thread_id ||
    owner.protocol_run_id !== turn.run_id ||
    !Number.isInteger(index) ||
    index < 0
  )
    throw new Error(
      "Disclosure requires the exact completed owned conversation.",
    );
  const block = turn.terminal.output?.blocks[index];
  if (block === undefined)
    throw new Error("The disclosed block is not retained in this turn.");
  return {
    index,
    kind: block.kind,
    text: block.text,
    citations: block.citations.map((key) => {
      const record = turn.context.records.find((record) => record.key === key);
      if (
        record === undefined ||
        !record.destination.startsWith(`/projects/${turn.project_id}/`)
      )
        throw new Error(
          "Disclosure cannot substitute a citation from another context.",
        );
      return { key, label: record.label, destination: record.destination };
    }),
  };
}
