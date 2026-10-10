import { EventType } from "@ag-ui/core";
import type { PetraAgentRuntimeEvent } from "@petra/core";
import { describe, expect, it } from "vitest";

import {
  CodexAppServerProtocolError,
  CodexEventTranslator,
  CodexSubscriptionProvider,
  type CodexProviderEvent,
  type CodexRpcMessagePort,
} from "../src/codex-app-server.js";

type RpcRecord = Record<string, unknown>;

class FakeMessagePort implements CodexRpcMessagePort {
  readonly sent: RpcRecord[] = [];
  readonly #messageListeners = new Set<(message: unknown) => void>();
  readonly #errorListeners = new Set<(error: Error) => void>();
  readonly #responses: Record<string, (params: unknown) => unknown>;
  closed = false;

  constructor(responses: Record<string, (params: unknown) => unknown> = {}) {
    this.#responses = responses;
  }

  send(message: RpcRecord): Promise<void> {
    this.sent.push(structuredClone(message));
    if (typeof message.method !== "string" || message.id === undefined) {
      return Promise.resolve();
    }
    const response = this.#responses[message.method];
    if (response === undefined) return Promise.resolve();
    queueMicrotask(() => {
      try {
        this.emit({ id: message.id, result: response(message.params) });
      } catch (error) {
        this.emit({
          id: message.id,
          error: {
            code: -32_000,
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    });
    return Promise.resolve();
  }

  onMessage(listener: (message: unknown) => void): () => void {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }

  onError(listener: (error: Error) => void): () => void {
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  emit(message: unknown): void {
    for (const listener of this.#messageListeners) listener(message);
  }

  fail(error: Error): void {
    for (const listener of this.#errorListeners) listener(error);
  }
}

const initializedPort = (
  responses: Record<string, (params: unknown) => unknown> = {},
): FakeMessagePort =>
  new FakeMessagePort({
    initialize: () => ({ userAgent: "codex_cli_rs/0.151.0" }),
    ...responses,
  });

describe("Codex app-server subscription provider", () => {
  it("performs the stable initialize handshake before any provider request", async () => {
    const port = initializedPort({
      "account/read": () => ({
        account: {
          type: "chatgpt",
          email: "private@example.test",
          planType: "plus",
        },
        requiresOpenaiAuth: true,
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port);

    expect(port.sent.slice(0, 2)).toEqual([
      {
        method: "initialize",
        id: 0,
        params: {
          clientInfo: {
            name: "petra",
            title: "Petra Scientific Workbench",
            version: "0.0.0",
          },
          capabilities: { experimentalApi: false },
        },
      },
      { method: "initialized", params: {} },
    ]);
    await expect(provider.readAccount()).resolves.toEqual({
      authenticated: true,
      authMode: "chatgpt",
      planType: "plus",
      requiresOpenaiAuth: true,
    });
    expect(JSON.stringify(await provider.readAccount())).not.toContain(
      "private@example.test",
    );
    expect(provider.diagnostics()).toMatchObject({
      initialized: true,
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      scientificExtractionEligible: false,
    });
    await provider.close();
  });

  it("exposes browser and device-code ceremonies without accepting external tokens", async () => {
    const port = initializedPort({
      "account/login/start": (value) => {
        const params = value as RpcRecord;
        return params.type === "chatgpt"
          ? {
              type: "chatgpt",
              loginId: "login-browser",
              authUrl: "https://chatgpt.com/oauth",
            }
          : {
              type: "chatgptDeviceCode",
              loginId: "login-device",
              verificationUrl: "https://auth.openai.com/codex/device",
              userCode: "ABCD-1234",
            };
      },
    });
    const provider = await CodexSubscriptionProvider.connect(port);

    await expect(provider.startManagedLogin("chatgpt")).resolves.toMatchObject({
      type: "chatgpt",
      loginId: "login-browser",
    });
    await expect(
      provider.startManagedLogin("chatgptDeviceCode"),
    ).resolves.toMatchObject({
      type: "chatgptDeviceCode",
      userCode: "ABCD-1234",
    });
    await expect(
      provider.startManagedLogin("chatgptAuthTokens" as never),
    ).rejects.toMatchObject({ code: "CODEX_LOGIN_MODE_FORBIDDEN" });
    expect(JSON.stringify(port.sent)).not.toMatch(
      /accessToken|apiKey|chatgptAccountId/,
    );
    await provider.close();
  });

  it("discovers only picker-visible subscription models through the stable catalog", async () => {
    const port = initializedPort({
      "model/list": () => ({
        data: [
          {
            id: "gpt-5.6-sol",
            model: "gpt-5.6-sol",
            displayName: "GPT-5.6 Sol",
            hidden: false,
            isDefault: true,
            defaultReasoningEffort: "low",
            supportedReasoningEfforts: [
              { reasoningEffort: "low", description: "Fast" },
              { reasoningEffort: "medium", description: "Balanced" },
            ],
            inputModalities: ["text", "image"],
            supportsPersonality: true,
          },
        ],
        nextCursor: null,
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port);

    await expect(provider.listModels()).resolves.toEqual([
      {
        id: "gpt-5.6-sol",
        model: "gpt-5.6-sol",
        displayName: "GPT-5.6 Sol",
        hidden: false,
        isDefault: true,
        defaultReasoningEffort: "low",
        supportedReasoningEfforts: ["low", "medium"],
        inputModalities: ["text", "image"],
        supportsPersonality: true,
      },
    ]);
    expect(port.sent.at(-1)).toMatchObject({
      method: "model/list",
      params: { limit: 100, includeHidden: false },
    });
    await provider.close();
  });

  it("refuses a managed-login response that points outside OpenAI authentication", async () => {
    const port = initializedPort({
      "account/login/start": () => ({
        type: "chatgpt",
        loginId: "login-hostile",
        authUrl: "https://example.test/steal-login",
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port);

    await expect(provider.startManagedLogin("chatgpt")).rejects.toMatchObject({
      code: "CODEX_LOGIN_URL_REFUSED",
    });
    await provider.close();
  });

  it("starts bounded threads and turns while leaving extraction uncertified", async () => {
    const port = initializedPort({
      "thread/start": () => ({
        thread: { id: "thr_petra" },
        model: "gpt-5.6-terra",
        modelProvider: "openai",
        cwd: "/work/petra",
      }),
      "turn/start": () => ({
        turn: { id: "turn_petra", status: "inProgress" },
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port);

    await expect(provider.startThread({ cwd: "/work/petra" })).resolves.toEqual(
      {
        threadId: "thr_petra",
        model: "gpt-5.6-terra",
        modelProvider: "openai",
        cwd: "/work/petra",
      },
    );
    await expect(
      provider.startTurn({ threadId: "thr_petra", prompt: "Run the tests." }),
    ).resolves.toEqual({
      threadId: "thr_petra",
      turnId: "turn_petra",
      status: "inProgress",
    });
    expect(
      port.sent.find((message) => message.method === "thread/start"),
    ).toMatchObject({
      params: {
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
        serviceName: "petra",
      },
    });
    expect(provider.diagnostics().scientificExtractionEligible).toBe(false);
    await provider.close();
  });

  it("disables built-in and inherited MCP tools before creating an advisory thread", async () => {
    const port = initializedPort({
      "config/read": () => ({
        config: {
          mcp_servers: {
            "private.server": { command: "sensitive-command", required: true },
          },
        },
      }),
      "thread/start": () => ({
        thread: { id: "advisory-thread" },
        model: "candidate-model",
        modelProvider: "openai",
        cwd: "/isolated",
        approvalPolicy: "never",
        sandbox: { type: "readOnly", networkAccess: false },
        instructionSources: [],
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port, {
      advisoryModel: "candidate-model",
    });
    const thread = await provider.startThread({
      model: "candidate-model",
      cwd: "/isolated",
      ephemeral: true,
      approvalPolicy: "never",
      sandbox: "read-only",
      advisoryOnly: true,
    });
    expect(thread.advisoryIsolation).toBe("petra.codex-no-tools@1.0.0");
    expect(port.sent.map((message) => message.method)).toEqual([
      "initialize",
      "initialized",
      "config/read",
      "thread/start",
    ]);
    expect(port.sent.at(-1)).toMatchObject({
      params: {
        config: {
          "features.shell_tool": false,
          "features.unified_exec": false,
          "features.apps": false,
          "features.plugins": false,
          "features.multi_agent_v2": false,
          "features.js_repl": false,
          web_search: "disabled",
          project_doc_max_bytes: 0,
          mcp_servers: {
            "private.server": { enabled: false, required: false },
          },
        },
      },
    });
    expect(JSON.stringify(port.sent)).not.toContain("sensitive-command");
    await provider.close();
  });

  it("refuses advisory input on a shared provider without the startup tool-free catalog", async () => {
    const port = initializedPort();
    const provider = await CodexSubscriptionProvider.connect(port);
    await expect(
      provider.startThread({
        model: "candidate-model",
        cwd: "/isolated",
        ephemeral: true,
        approvalPolicy: "never",
        sandbox: "read-only",
        advisoryOnly: true,
      }),
    ).rejects.toMatchObject({ code: "CODEX_TOOL_POLICY_REQUIRED" });
    expect(
      port.sent.some(
        (message) =>
          message.method === "thread/start" || message.method === "turn/start",
      ),
    ).toBe(false);
    await provider.close();
  });

  it("fails closed when an advisory thread loads unapproved instruction sources", async () => {
    const port = initializedPort({
      "config/read": () => ({ config: {} }),
      "thread/start": () => ({
        thread: { id: "advisory-thread" },
        model: "candidate-model",
        cwd: "/isolated",
        approvalPolicy: "never",
        sandbox: { type: "readOnly" },
        instructionSources: ["/unapproved/AGENTS.md"],
      }),
    });
    const provider = await CodexSubscriptionProvider.connect(port, {
      advisoryModel: "candidate-model",
    });
    await expect(
      provider.startThread({
        model: "candidate-model",
        cwd: "/isolated",
        ephemeral: true,
        approvalPolicy: "never",
        sandbox: "read-only",
        advisoryOnly: true,
      }),
    ).rejects.toMatchObject({ code: "CODEX_TOOL_POLICY_REFUSED" });
    expect(port.sent.some((message) => message.method === "turn/start")).toBe(
      false,
    );
    await provider.close();
  });

  it("surfaces approvals, resolves only supported requests, and refuses token refresh", async () => {
    const port = initializedPort();
    const provider = await CodexSubscriptionProvider.connect(port);
    const events: CodexProviderEvent[] = [];
    provider.onEvent((event) => events.push(event));

    port.emit({
      method: "item/commandExecution/requestApproval",
      id: 41,
      params: {
        threadId: "thr_petra",
        turnId: "turn_petra",
        itemId: "item_command",
        command: "npm test",
      },
    });
    expect(provider.diagnostics().pendingServerRequests).toBe(1);
    await provider.resolveApproval(41, "accept");
    expect(port.sent.at(-1)).toEqual({
      id: 41,
      result: { decision: "accept" },
    });
    expect(events.at(-1)).toMatchObject({
      kind: "server_request_resolved",
      requestId: 41,
    });

    port.emit({
      method: "account/chatgptAuthTokens/refresh",
      id: 42,
      params: { previousAccountId: "org-private" },
    });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(port.sent.at(-1)).toMatchObject({
      id: 42,
      error: { code: -32601 },
    });
    expect(provider.diagnostics().pendingServerRequests).toBe(0);
    expect(events.at(-1)).toMatchObject({
      kind: "protocol_error",
      code: "CODEX_EXTERNAL_TOKEN_REQUEST_REFUSED",
    });
    expect(JSON.stringify(events)).not.toContain("org-private");
    await provider.close();
  });

  it("fails closed on request timeout and transport errors", async () => {
    const port = initializedPort();
    const provider = await CodexSubscriptionProvider.connect(port, {
      requestTimeoutMs: 5,
    });

    await expect(provider.readAccount()).rejects.toMatchObject({
      code: "CODEX_REQUEST_TIMEOUT",
    });
    const accountRequest = provider.readAccount();
    port.fail(new CodexAppServerProtocolError("BROKEN_PIPE", "broken"));
    await expect(accountRequest).rejects.toMatchObject({ code: "BROKEN_PIPE" });
    expect(provider.diagnostics().initialized).toBe(false);
    await provider.close();
  });
});

describe("Codex to Petra event translation", () => {
  const context = {
    threadId: "petra_thread",
    runId: "petra_run",
    requestId: "request_1",
    traceId: "trace_1",
    workUnitId: "work_unit_1",
    modelRequestId: "model_request_1",
    now: () => 1_788_465_600_000,
  };

  it("maps streamed messages and terminal state into AG-UI and graph-runtime observations", () => {
    const translator = new CodexEventTranslator(context);
    const batches = [
      translator.translate({
        kind: "notification",
        method: "turn/started",
        params: {
          threadId: "thr_codex",
          turn: { id: "turn_codex", status: "inProgress" },
        },
      }),
      translator.translate({
        kind: "notification",
        method: "item/started",
        params: {
          threadId: "thr_codex",
          turnId: "turn_codex",
          item: { type: "agentMessage", id: "message_codex", text: "" },
        },
      }),
      translator.translate({
        kind: "notification",
        method: "item/agentMessage/delta",
        params: {
          threadId: "thr_codex",
          turnId: "turn_codex",
          itemId: "message_codex",
          delta: "Evidence first.",
        },
      }),
      translator.translate({
        kind: "notification",
        method: "item/completed",
        params: {
          threadId: "thr_codex",
          turnId: "turn_codex",
          item: {
            type: "agentMessage",
            id: "message_codex",
            text: "Evidence first.",
          },
        },
      }),
      translator.translate({
        kind: "notification",
        method: "turn/completed",
        params: {
          threadId: "thr_codex",
          turn: { id: "turn_codex", status: "completed", error: null },
        },
      }),
    ];
    const agUi = batches.flatMap((batch) => batch.agUiEvents);
    const recorded: PetraAgentRuntimeEvent[] = batches.flatMap(
      (batch) => batch.graphRuntimeEvents,
    );

    expect(agUi.map((event) => event.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
    expect(recorded.map((event) => event.kind)).toEqual([
      "agent.turn.started",
      "agent.message.started",
      "agent.message.delta",
      "agent.message.completed",
      "agent.turn.completed",
    ]);
    expect(
      recorded.every((event) => event.scientificAuthorityEffect === "none"),
    ).toBe(true);
  });

  it("renders tools and approvals as visible non-authoritative activity", () => {
    const translator = new CodexEventTranslator(context);
    const toolStart = translator.translate({
      kind: "notification",
      method: "item/started",
      params: {
        threadId: "thr_codex",
        turnId: "turn_codex",
        item: {
          type: "commandExecution",
          id: "item_command",
          command: "npm test",
          cwd: "/work/petra",
          status: "inProgress",
        },
      },
    });
    const approval = translator.translate({
      kind: "server_request",
      requestId: 9,
      method: "item/commandExecution/requestApproval",
      params: {
        threadId: "thr_codex",
        turnId: "turn_codex",
        itemId: "item_command",
        command: "npm test",
        cwd: "/work/petra",
      },
    });
    const toolEnd = translator.translate({
      kind: "notification",
      method: "item/completed",
      params: {
        threadId: "thr_codex",
        turnId: "turn_codex",
        item: {
          type: "commandExecution",
          id: "item_command",
          status: "completed",
        },
      },
    });

    expect(toolStart.agUiEvents.map((event) => event.type)).toEqual([
      EventType.TOOL_CALL_START,
      EventType.TOOL_CALL_ARGS,
    ]);
    expect(approval.agUiEvents).toHaveLength(1);
    expect(approval.agUiEvents[0]).toMatchObject({
      type: EventType.ACTIVITY_SNAPSHOT,
      activityType: "petra.provider.approval",
      content: { requestId: 9, status: "awaiting_user" },
    });
    expect(approval.graphRuntimeEvents[0]).toMatchObject({
      kind: "agent.approval.requested",
      status: "awaiting_user",
      scientificAuthorityEffect: "none",
    });
    expect(toolEnd.agUiEvents.map((event) => event.type)).toEqual([
      EventType.TOOL_CALL_END,
    ]);
  });

  it("does not expose raw reasoning events as assistant text", () => {
    const translator = new CodexEventTranslator(context);
    const result = translator.translate({
      kind: "notification",
      method: "item/reasoning/textDelta",
      params: { delta: "private reasoning" },
    });
    expect(result).toEqual({ agUiEvents: [], graphRuntimeEvents: [] });
  });

  it("uses authoritative completed message text when no delta arrived", () => {
    const translator = new CodexEventTranslator(context);
    translator.translate({
      kind: "notification",
      method: "item/started",
      params: {
        threadId: "thr_codex",
        turnId: "turn_codex",
        item: { type: "agentMessage", id: "message_complete", text: "" },
      },
    });
    const completed = translator.translate({
      kind: "notification",
      method: "item/completed",
      params: {
        threadId: "thr_codex",
        turnId: "turn_codex",
        item: {
          type: "agentMessage",
          id: "message_complete",
          text: "Authoritative final text.",
        },
      },
    });

    expect(completed.agUiEvents).toEqual([
      expect.objectContaining({
        type: EventType.TEXT_MESSAGE_CONTENT,
        delta: "Authoritative final text.",
      }),
      expect.objectContaining({ type: EventType.TEXT_MESSAGE_END }),
    ]);
  });
});
