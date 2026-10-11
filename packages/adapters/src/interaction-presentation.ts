import { EventType, type BaseEvent } from "@ag-ui/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { PetraInteractionCustomEvent } from "@petra/contracts";
import type { InteractionPresentation } from "@petra/core/copilot-presentation";

const contracts = new PetraContractRegistry();
const activities = new Set([
  "petra.work_unit.status",
  "petra.retrieval.status",
  "petra.evidence_packet.status",
  "petra.model.status",
  "petra.validation.status",
]);
const statuses = new Set([
  "queued",
  "running",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
]);
const object = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Malformed interaction presentation.");
  return value as Record<string, unknown>;
};
export function assertInteractionCustomEvent(
  name: string,
  value: unknown,
): PetraInteractionCustomEvent {
  contracts.assertValid("interaction-custom-event", "1.0.0", value);
  const event = value as PetraInteractionCustomEvent;
  if (event.event_name !== name)
    throw new Error("Custom event name differs from its registered payload.");
  return event;
}

/** Protocol interpretation stays entirely inside the adapter. */
export class InteractionPresenter {
  #view: InteractionPresentation;
  #tool:
    | {
        id: string;
        name: "petra.inspect_evidence" | "petra.review_changeset";
        json: string;
      }
    | undefined;
  constructor(threadId: string, runId: string) {
    this.#view = {
      threadId,
      runId,
      phase: "running",
      authority: "none",
      text: "",
    };
  }
  get view(): InteractionPresentation {
    return structuredClone(this.#view);
  }
  apply(raw: BaseEvent): InteractionPresentation {
    const event = object(raw);
    switch (event.type) {
      case EventType.RUN_STARTED:
      case EventType.RUN_FINISHED: {
        if (
          event.threadId !== this.#view.threadId ||
          event.runId !== this.#view.runId
        )
          throw new Error("Foreign interaction presentation run.");
        if (event.type === EventType.RUN_FINISHED) {
          const outcome =
            event.outcome === undefined ? undefined : object(event.outcome);
          if (outcome?.type === "interrupt") {
            if (this.#view.review === undefined)
              throw new Error("Unregistered interrupt cannot become a review.");
            const interrupts = outcome.interrupts;
            if (
              !Array.isArray(interrupts) ||
              interrupts.length !== 1 ||
              object(interrupts[0]).id !== this.#view.review.interruptId
            )
              throw new Error(
                "Interrupt outcome differs from registered review.",
              );
            this.#view = { ...this.#view, phase: "awaiting_review" };
          } else if (outcome === undefined || outcome.type === "success")
            this.#view = { ...this.#view, phase: "completed" };
          else throw new Error("Unsupported interaction outcome.");
        }
        break;
      }
      case EventType.TEXT_MESSAGE_CONTENT:
        if (typeof event.delta !== "string")
          throw new Error("Malformed advisory text.");
        this.#view = { ...this.#view, text: this.#view.text + event.delta };
        break;
      case EventType.ACTIVITY_SNAPSHOT: {
        const content = object(event.content);
        if (
          !activities.has(String(event.activityType)) ||
          !statuses.has(String(content.status)) ||
          typeof content.label !== "string" ||
          content.label.length > 500
        )
          throw new Error("Unregistered activity state.");
        this.#view = {
          ...this.#view,
          activity: { label: content.label, status: String(content.status) },
        };
        break;
      }
      case EventType.CUSTOM: {
        const custom = assertInteractionCustomEvent(
          String(event.name),
          event.value,
        );
        if (custom.event_name === "petra.work_unit.status") {
          const metadata = object(object(event.metadata).petra);
          if (metadata.workUnitId !== custom.payload.work_unit_id)
            throw new Error("Custom Work status substituted its owner.");
          this.#view = {
            ...this.#view,
            work: {
              id: custom.payload.work_unit_id,
              revision: custom.payload.work_unit_revision,
              status: custom.payload.status,
            },
          };
        } else
          this.#view = {
            ...this.#view,
            review: {
              interruptId: custom.payload.interaction_interrupt_id,
              changeSet: {
                id: custom.payload.change_set_ref.change_set_id,
                revision: custom.payload.change_set_ref.revision,
                contentHash: custom.payload.change_set_ref.content_hash,
              },
            },
          };
        break;
      }
      case EventType.TOOL_CALL_START:
        if (
          this.#tool !== undefined ||
          typeof event.toolCallId !== "string" ||
          !["petra.inspect_evidence", "petra.review_changeset"].includes(
            String(event.toolCallName),
          )
        )
          throw new Error("Unregistered tool proposal.");
        this.#tool = {
          id: event.toolCallId,
          name: event.toolCallName as
            "petra.inspect_evidence" | "petra.review_changeset",
          json: "",
        };
        break;
      case EventType.TOOL_CALL_ARGS:
        if (
          this.#tool === undefined ||
          this.#tool.id !== event.toolCallId ||
          typeof event.delta !== "string"
        )
          throw new Error("Tool arguments lack their exact proposal.");
        this.#tool.json += event.delta;
        if (this.#tool.json.length > 262144)
          throw new Error("Tool proposal exceeds its presentation bound.");
        break;
      case EventType.TOOL_CALL_END:
        if (this.#tool === undefined || this.#tool.id !== event.toolCallId)
          throw new Error("Tool end lacks its exact proposal.");
        this.#view = {
          ...this.#view,
          proposal: {
            id: this.#tool.id,
            tool: this.#tool.name,
            arguments: object(JSON.parse(this.#tool.json)),
          },
        };
        this.#tool = undefined;
        break;
      case EventType.STATE_SNAPSHOT: {
        const state = object(event.snapshot);
        if (
          !statuses.has(String(state.workUnitStatus)) ||
          state.posture !== "collaborative_research_assistant"
        )
          throw new Error("Unregistered interaction state.");
        break;
      }
      case EventType.RUN_ERROR:
        this.#view = {
          ...this.#view,
          phase: "failed",
          limitation: String(event.message),
        };
        break;
      case EventType.TEXT_MESSAGE_START:
      case EventType.TEXT_MESSAGE_END:
        break;
      default:
        throw new Error("Unsupported interaction event.");
    }
    return this.view;
  }
}
