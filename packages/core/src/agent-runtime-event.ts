export type AgentRuntimeEventKind =
  | "agent.turn.started"
  | "agent.message.started"
  | "agent.message.delta"
  | "agent.message.completed"
  | "agent.tool.started"
  | "agent.tool.completed"
  | "agent.approval.requested"
  | "agent.approval.resolved"
  | "agent.turn.completed"
  | "agent.turn.failed"
  | "agent.warning";

export interface AgentRuntimeSource {
  adapterId: string;
  providerKind: string;
  providerThreadId?: string;
  providerTurnId?: string;
  providerItemId?: string;
  providerRequestId?: string;
}

/**
 * A provider-neutral observation from an agent runtime. These events can drive
 * interface and workflow projections, but never mutate Petra's scientific
 * graph or establish evidence authority by themselves.
 */
export interface PetraAgentRuntimeEvent {
  kind: AgentRuntimeEventKind;
  occurredAt: number;
  source: AgentRuntimeSource;
  status: "running" | "awaiting_user" | "completed" | "interrupted" | "failed";
  summary: string;
  details: Readonly<Record<string, unknown>>;
  scientificAuthorityEffect: "none";
}

export interface AgentRuntimeEventSink {
  record(event: PetraAgentRuntimeEvent): void | Promise<void>;
}
