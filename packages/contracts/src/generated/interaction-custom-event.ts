/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A closed M1 payload for a Petra-namespaced interaction event. It reports interface state and cannot itself authorize a domain change.
 */
export type PetraInteractionCustomEvent =
  WorkUnitStatusEvent | ReviewInterruptEvent;
export type InteractionInterruptId = string;

export interface WorkUnitStatusEvent {
  schema_name: "petra.interaction-custom-event";
  schema_version: "1.0.0";
  event_name: "petra.work_unit.status";
  payload: {
    work_unit_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    work_unit_revision: number;
    status:
      | "requested"
      | "queued"
      | "running"
      | "checkpointed"
      | "succeeded"
      | "failed"
      | "cancelled";
    label: string;
    authority_effect: "none";
  };
}
export interface ReviewInterruptEvent {
  schema_name: "petra.interaction-custom-event";
  schema_version: "1.0.0";
  event_name: "petra.review.interrupt";
  payload: {
    interaction_interrupt_id: InteractionInterruptId;
    change_set_ref: ChangeSetRef;
    authority_effect: "none";
  };
}
export interface ChangeSetRef {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
