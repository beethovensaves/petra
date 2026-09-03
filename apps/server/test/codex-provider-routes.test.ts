import type {
  CodexApprovalDecision,
  CodexManagedLoginResult,
  CodexProviderDiagnostics,
  CodexProviderEvent,
  CodexRpcId,
  CodexSubscriptionProviderPort,
  CodexThreadStartRequest,
  CodexThreadSummary,
  CodexTurnStartRequest,
  CodexTurnSummary,
} from "@petra/adapters/server";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "petra-codex-route-test";

class FakeCodexProvider implements CodexSubscriptionProviderPort {
  readonly threadRequests: CodexThreadStartRequest[] = [];
  readonly turnRequests: CodexTurnStartRequest[] = [];
  readonly approvals: Array<{
    requestId: CodexRpcId;
    decision: CodexApprovalDecision;
  }> = [];
  readonly loginTypes: Array<"chatgpt" | "chatgptDeviceCode"> = [];

  diagnostics(): CodexProviderDiagnostics {
    return {
      providerKind: "codex_app_server",
      initialized: true,
      transport: "stdio_jsonl",
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      pendingRequests: 0,
      pendingServerRequests: 0,
      scientificExtractionEligible: false,
    };
  }

  listModels(): Promise<
    readonly [
      {
        id: "gpt-5.6-sol";
        model: "gpt-5.6-sol";
        displayName: "GPT-5.6 Sol";
        hidden: false;
        isDefault: true;
        defaultReasoningEffort: "low";
        supportedReasoningEfforts: readonly ["low", "medium"];
        inputModalities: readonly ["text", "image"];
        supportsPersonality: true;
      },
    ]
  > {
    return Promise.resolve([
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
  }

  readAccount(): Promise<{
    authenticated: true;
    authMode: "chatgpt";
    planType: "plus";
    requiresOpenaiAuth: true;
  }> {
    return Promise.resolve({
      authenticated: true,
      authMode: "chatgpt",
      planType: "plus",
      requiresOpenaiAuth: true,
    });
  }

  startManagedLogin(
    type: "chatgpt" | "chatgptDeviceCode",
  ): Promise<CodexManagedLoginResult> {
    this.loginTypes.push(type);
    return Promise.resolve(
      type === "chatgpt"
        ? {
            type,
            loginId: "login-browser",
            authUrl: "https://chatgpt.com/oauth",
          }
        : {
            type,
            loginId: "login-device",
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: "ABCD-1234",
          },
    );
  }

  cancelManagedLogin(): Promise<void> {
    return Promise.resolve();
  }

  startThread(request: CodexThreadStartRequest): Promise<CodexThreadSummary> {
    this.threadRequests.push(request);
    return Promise.resolve({
      threadId: "thr_petra",
      model: request.model ?? "entitled-default",
      modelProvider: "openai",
      cwd: request.cwd,
    });
  }

  startTurn(request: CodexTurnStartRequest): Promise<CodexTurnSummary> {
    this.turnRequests.push(request);
    return Promise.resolve({
      threadId: request.threadId,
      turnId: "turn_petra",
      status: "inProgress",
    });
  }

  interruptTurn(): Promise<void> {
    return Promise.resolve();
  }

  resolveApproval(
    requestId: CodexRpcId,
    decision: CodexApprovalDecision,
  ): Promise<void> {
    this.approvals.push({ requestId, decision });
    return Promise.resolve();
  }

  onEvent(listener: (event: CodexProviderEvent) => void): () => void {
    void listener;
    return () => undefined;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

const request = (
  app: ReturnType<typeof createPetraApp>["app"],
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<Response> =>
  Promise.resolve(
    app.request(path, {
      method: options.method ?? "GET",
      headers: {
        authorization: `Bearer ${options.token ?? TOKEN}`,
        "content-type": "application/json",
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    }),
  );

describe("Codex provider application boundary", () => {
  it("exposes only a credential-free account summary and managed login ceremony", async () => {
    const provider = new FakeCodexProvider();
    const petra = createPetraApp({
      authToken: TOKEN,
      codexProvider: provider,
      codexWorkspaceRoot: "/work/petra",
    });

    const account = await request(petra.app, "/api/providers/codex/account");
    expect(account.status).toBe(200);
    expect(await account.json()).toEqual({
      authenticated: true,
      authMode: "chatgpt",
      planType: "plus",
      requiresOpenaiAuth: true,
    });

    const models = await request(petra.app, "/api/providers/codex/models");
    expect(models.status).toBe(200);
    expect(await models.json()).toMatchObject({
      models: [{ model: "gpt-5.6-sol", isDefault: true }],
    });

    const login = await request(petra.app, "/api/providers/codex/login", {
      method: "POST",
      body: { type: "chatgptDeviceCode" },
    });
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({
      type: "chatgptDeviceCode",
      userCode: "ABCD-1234",
    });

    const externalTokens = await request(
      petra.app,
      "/api/providers/codex/login",
      {
        method: "POST",
        body: { type: "chatgptAuthTokens", accessToken: "never-send" },
      },
    );
    expect(externalTokens.status).toBe(422);
    expect(provider.loginTypes).toEqual(["chatgptDeviceCode"]);
  });

  it("fixes the workspace root server-side and excludes danger-full-access", async () => {
    const provider = new FakeCodexProvider();
    const petra = createPetraApp({
      authToken: TOKEN,
      codexProvider: provider,
      codexWorkspaceRoot: "/work/petra",
    });

    const overriddenRoot = await request(
      petra.app,
      "/api/providers/codex/threads",
      {
        method: "POST",
        body: { cwd: "/", sandbox: "workspace-write" },
      },
    );
    expect(overriddenRoot.status).toBe(422);

    const dangerous = await request(petra.app, "/api/providers/codex/threads", {
      method: "POST",
      body: { sandbox: "danger-full-access" },
    });
    expect(dangerous.status).toBe(422);

    const valid = await request(petra.app, "/api/providers/codex/threads", {
      method: "POST",
      body: {
        model: "gpt-entitled",
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
      },
    });
    expect(valid.status).toBe(200);
    expect(provider.threadRequests).toEqual([
      {
        cwd: "/work/petra",
        model: "gpt-entitled",
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
      },
    ]);
  });

  it("routes turns, interrupts, and approvals without creating scientific authority", async () => {
    const provider = new FakeCodexProvider();
    const petra = createPetraApp({
      authToken: TOKEN,
      codexProvider: provider,
      codexWorkspaceRoot: "/work/petra",
    });

    const turn = await request(petra.app, "/api/providers/codex/turns", {
      method: "POST",
      body: {
        threadId: "thr_petra",
        prompt: "Implement the bounded experiment.",
        effort: "medium",
      },
    });
    expect(turn.status).toBe(200);
    expect(provider.turnRequests).toEqual([
      {
        threadId: "thr_petra",
        prompt: "Implement the bounded experiment.",
        effort: "medium",
      },
    ]);

    const approval = await request(
      petra.app,
      "/api/providers/codex/approvals/resolve",
      {
        method: "POST",
        body: { requestId: 17, decision: "accept" },
      },
    );
    expect(approval.status).toBe(200);
    expect(provider.approvals).toEqual([{ requestId: 17, decision: "accept" }]);
    expect(provider.diagnostics().scientificExtractionEligible).toBe(false);
  });

  it("fails visibly when the provider is not enabled", async () => {
    const petra = createPetraApp({ authToken: TOKEN });
    const response = await request(petra.app, "/api/providers/codex/account");
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "CODEX_PROVIDER_UNAVAILABLE" },
    });
  });
});
