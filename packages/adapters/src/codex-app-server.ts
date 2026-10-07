import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  createInterface,
  type Interface as ReadLineInterface,
} from "node:readline";

import { EventType, type BaseEvent } from "@ag-ui/core";
import type { PetraAgentRuntimeEvent } from "@petra/core";

export type CodexRpcId = number | string;

export interface CodexRpcMessagePort {
  send(message: Readonly<Record<string, unknown>>): Promise<void>;
  onMessage(listener: (message: unknown) => void): () => void;
  onError(listener: (error: Error) => void): () => void;
  close(): Promise<void>;
}

export interface CodexSidecarOptions {
  command?: string;
  cwd?: string;
  requestTimeoutMs?: number;
  maxMessageBytes?: number;
  /** Dedicated startup catalog; never applied to shared or existing threads. */
  advisoryModel?: string;
  codexHome?: string;
  modelCatalogPath?: string;
}

export interface CodexAccountSummary {
  authenticated: boolean;
  authMode: "chatgpt" | "apiKey" | "amazonBedrock" | "none" | "unknown";
  planType: string | null;
  requiresOpenaiAuth: boolean;
}

export interface CodexModelSummary {
  id: string;
  model: string;
  displayName: string;
  hidden: boolean;
  isDefault: boolean;
  defaultReasoningEffort: string | null;
  supportedReasoningEfforts: readonly string[];
  inputModalities: readonly string[];
  supportsPersonality: boolean;
}

export type CodexManagedLoginResult =
  | {
      type: "chatgpt";
      loginId: string;
      authUrl: string;
    }
  | {
      type: "chatgptDeviceCode";
      loginId: string;
      verificationUrl: string;
      userCode: string;
    };

export interface CodexThreadStartRequest {
  model?: string;
  cwd: string;
  approvalPolicy?: "untrusted" | "on-request" | "never";
  sandbox?: "read-only" | "workspace-write";
  personality?: "none" | "friendly" | "pragmatic";
  baseInstructions?: string;
  developerInstructions?: string;
  ephemeral?: boolean;
  /** Server-owned advisory role: disable provider tools before exposing input. */
  advisoryOnly?: boolean;
}

export interface CodexThreadSummary {
  threadId: string;
  model: string | null;
  modelProvider: string | null;
  cwd: string;
  advisoryIsolation?: "petra.codex-no-tools@1.0.0";
}

export interface CodexTurnStartRequest {
  threadId: string;
  prompt: string;
  model?: string;
  effort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  outputSchema?: Readonly<Record<string, unknown>>;
}

export interface CodexTurnSummary {
  threadId: string;
  turnId: string;
  status: string;
}

export type CodexApprovalDecision =
  "accept" | "acceptForSession" | "decline" | "cancel";

export type CodexProviderEvent =
  | {
      kind: "notification";
      method: string;
      params: unknown;
    }
  | {
      kind: "server_request";
      requestId: CodexRpcId;
      method: string;
      params: unknown;
    }
  | {
      kind: "server_request_resolved";
      requestId: CodexRpcId;
      method: string;
      decision: CodexApprovalDecision;
    }
  | {
      kind: "protocol_error";
      code: string;
      message: string;
    };

export interface CodexProviderDiagnostics {
  providerKind: "codex_app_server";
  initialized: boolean;
  transport: "stdio_jsonl";
  stableApiOnly: true;
  managedChatgptAuthOnly: true;
  pendingRequests: number;
  pendingServerRequests: number;
  scientificExtractionEligible: false;
}

export interface CodexSubscriptionProviderPort {
  diagnostics(): CodexProviderDiagnostics;
  readAccount(): Promise<CodexAccountSummary>;
  listModels(): Promise<readonly CodexModelSummary[]>;
  startManagedLogin(
    type: "chatgpt" | "chatgptDeviceCode",
  ): Promise<CodexManagedLoginResult>;
  cancelManagedLogin(loginId: string): Promise<void>;
  startThread(request: CodexThreadStartRequest): Promise<CodexThreadSummary>;
  startTurn(request: CodexTurnStartRequest): Promise<CodexTurnSummary>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  resolveApproval(
    requestId: CodexRpcId,
    decision: CodexApprovalDecision,
  ): Promise<void>;
  onEvent(listener: (event: CodexProviderEvent) => void): () => void;
  close(): Promise<void>;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingServerRequest {
  method: string;
  params: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// These overrides are supported by the certified 0.154.0 ConfigToml schema.
// They apply to one ephemeral thread; user/provider configuration is never written.
const advisoryConfiguration = (
  configuration: Record<string, unknown>,
): Record<string, unknown> => {
  const disabledFeatures = [
    "shell_tool",
    "unified_exec",
    "experimental_use_unified_exec_tool",
    "apply_patch_freeform",
    "apps",
    "connectors",
    "plugins",
    "remote_plugin",
    "plugin_hooks",
    "hooks",
    "codex_hooks",
    "workspace_dependencies",
    "multi_agent",
    "multi_agent_v2",
    "multi_agent_mode",
    "collab",
    "collaboration_modes",
    "enable_fanout",
    "browser_use",
    "browser_use_external",
    "browser_use_full_cdp_access",
    "computer_use",
    "in_app_browser",
    "js_repl",
    "js_repl_tools_only",
    "code_mode",
    "code_mode_only",
    "code_mode_host",
    "code_mode_prewarm",
    "deferred_executor",
    "search_tool",
    "tool_search",
    "tool_suggest",
    "standalone_web_search",
    "web_search",
    "web_search_cached",
    "web_search_request",
    "view_image",
    "image_generation",
    "imagegenext",
    "memories",
    "memory_tool",
    "goals",
    "request_permissions",
    "request_permissions_tool",
    "default_mode_request_user_input",
    "sleep_tool",
    "current_time_reminder",
    "skill_search",
    "skill_mcp_dependency_install",
    "skill_env_var_dependency_prompt",
    "enable_mcp_apps",
    "token_budget",
    "unavailable_dummy_tools",
  ];
  const result: Record<string, unknown> = {
    ...Object.fromEntries(
      disabledFeatures.map((name) => [`features.${name}`, false]),
    ),
    "features.skip_host_skill_discovery": true,
    "agents.enabled": false,
    "orchestrator.mcp.enabled": false,
    "orchestrator.skills.enabled": false,
    "tools.update_plan.enabled": false,
    "tools.experimental_request_user_input.enabled": false,
    "skills.include_instructions": false,
    web_search: "disabled",
    project_doc_max_bytes: 0,
    developer_instructions: "",
  };
  const servers = configuration.mcp_servers;
  if (servers !== undefined && servers !== null && !isRecord(servers)) {
    throw new CodexAppServerProtocolError(
      "CODEX_TOOL_POLICY_UNAVAILABLE",
      "The provider MCP configuration is malformed.",
    );
  }
  // Use an object override so server names remain literal keys, including dots.
  result.mcp_servers = Object.fromEntries(
    Object.keys(servers ?? {}).map((name) => [
      name,
      { enabled: false, required: false },
    ]),
  );
  return result;
};

const nonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new CodexAppServerProtocolError(
      "CODEX_RESPONSE_INVALID",
      `${label} was absent from the Codex app-server response.`,
    );
  }
  return value;
};

const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const managedLoginUrl = (
  value: unknown,
  label: string,
  allowedHosts: ReadonlySet<string>,
): string => {
  const serialized = nonEmptyString(value, label);
  let parsed: URL;
  try {
    parsed = new URL(serialized);
  } catch {
    throw new CodexAppServerProtocolError(
      "CODEX_RESPONSE_INVALID",
      `${label} was not a valid URL.`,
    );
  }
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new CodexAppServerProtocolError(
      "CODEX_LOGIN_URL_REFUSED",
      `${label} did not use an approved OpenAI authentication origin.`,
    );
  }
  return serialized;
};

const rpcKey = (id: CodexRpcId): string => `${typeof id}:${String(id)}`;

const rpcId = (value: unknown): CodexRpcId | undefined =>
  typeof value === "string" ||
  (typeof value === "number" && Number.isSafeInteger(value))
    ? value
    : undefined;

const errorMessage = (value: unknown): string => {
  if (!isRecord(value)) return "Codex app-server returned an unknown error.";
  return typeof value.message === "string"
    ? value.message
    : "Codex app-server returned an unknown error.";
};

export class CodexAppServerProtocolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CodexAppServerProtocolError";
    this.code = code;
  }
}

export class CodexStdioMessagePort implements CodexRpcMessagePort {
  readonly #process: ChildProcessWithoutNullStreams;
  readonly #reader: ReadLineInterface;
  readonly #messageListeners = new Set<(message: unknown) => void>();
  readonly #errorListeners = new Set<(error: Error) => void>();
  readonly #maxMessageBytes: number;
  readonly #closed: Promise<void>;
  #closing = false;

  constructor(options: CodexSidecarOptions = {}) {
    this.#maxMessageBytes = options.maxMessageBytes ?? 8 * 1024 * 1024;
    this.#process = spawn(
      options.command ?? "codex",
      [
        "app-server",
        "--listen",
        "stdio://",
        ...(options.modelCatalogPath === undefined
          ? []
          : [
              "--config",
              `model_catalog_json=${JSON.stringify(options.modelCatalogPath)}`,
            ]),
      ],
      {
        cwd: options.cwd,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.#reader = createInterface({ input: this.#process.stdout });
    this.#reader.on("line", (line: string) => this.#receiveLine(line));
    this.#process.on("error", (error) => this.#emitError(error));
    this.#process.stderr.on("data", () => {
      // App-server diagnostics may include local paths or account context. Petra
      // deliberately does not retain or forward this stream.
    });
    this.#closed = new Promise<void>((resolve) => {
      this.#process.once("close", (code, signal) => {
        if (!this.#closing) {
          this.#emitError(
            new CodexAppServerProtocolError(
              "CODEX_SIDECAR_EXITED",
              `Codex app-server exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
            ),
          );
        }
        resolve();
      });
    });
  }

  async send(message: Readonly<Record<string, unknown>>): Promise<void> {
    if (this.#closing || this.#process.stdin.destroyed) {
      throw new CodexAppServerProtocolError(
        "CODEX_SIDECAR_CLOSED",
        "The Codex app-server sidecar is closed.",
      );
    }
    const line = `${JSON.stringify(message)}\n`;
    if (Buffer.byteLength(line, "utf8") > this.#maxMessageBytes) {
      throw new CodexAppServerProtocolError(
        "CODEX_REQUEST_TOO_LARGE",
        "The Codex app-server request exceeded Petra's transport limit.",
      );
    }
    await new Promise<void>((resolve, reject) => {
      this.#process.stdin.write(line, (error) =>
        error === null || error === undefined ? resolve() : reject(error),
      );
    });
  }

  onMessage(listener: (message: unknown) => void): () => void {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }

  onError(listener: (error: Error) => void): () => void {
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.#closing) return this.#closed;
    this.#closing = true;
    this.#reader.close();
    this.#process.stdin.end();
    if (this.#process.exitCode === null && this.#process.signalCode === null) {
      this.#process.kill("SIGTERM");
    }
    await this.#closed;
  }

  #receiveLine(line: string): void {
    if (Buffer.byteLength(line, "utf8") > this.#maxMessageBytes) {
      this.#emitError(
        new CodexAppServerProtocolError(
          "CODEX_RESPONSE_TOO_LARGE",
          "A Codex app-server response exceeded Petra's transport limit.",
        ),
      );
      return;
    }
    try {
      const message = JSON.parse(line) as unknown;
      for (const listener of this.#messageListeners) listener(message);
    } catch {
      this.#emitError(
        new CodexAppServerProtocolError(
          "CODEX_RESPONSE_MALFORMED",
          "Codex app-server emitted malformed JSONL.",
        ),
      );
    }
  }

  #emitError(error: Error): void {
    for (const listener of this.#errorListeners) listener(error);
  }
}

export class CodexSubscriptionProvider implements CodexSubscriptionProviderPort {
  readonly #port: CodexRpcMessagePort;
  readonly #requestTimeoutMs: number;
  readonly #advisoryModel: string | undefined;
  readonly #cleanup: (() => Promise<void>) | undefined;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #pendingServer = new Map<string, PendingServerRequest>();
  readonly #listeners = new Set<(event: CodexProviderEvent) => void>();
  #nextId = 0;
  #initialized = false;
  #closed = false;

  private constructor(
    port: CodexRpcMessagePort,
    options: {
      requestTimeoutMs?: number;
      advisoryModel?: string;
      cleanup?: () => Promise<void>;
    } = {},
  ) {
    this.#port = port;
    this.#advisoryModel = options.advisoryModel;
    this.#cleanup = options.cleanup;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    port.onMessage((message) => this.#receive(message));
    port.onError((error) => this.#failTransport(error));
  }

  static async connect(
    port: CodexRpcMessagePort,
    options: {
      requestTimeoutMs?: number;
      advisoryModel?: string;
      cleanup?: () => Promise<void>;
    } = {},
  ): Promise<CodexSubscriptionProvider> {
    const provider = new CodexSubscriptionProvider(port, options);
    try {
      await provider.#initialize();
      return provider;
    } catch (error) {
      await provider.close();
      throw error;
    }
  }

  static async startSidecar(
    options: CodexSidecarOptions = {},
  ): Promise<CodexSubscriptionProvider> {
    let directory: string | undefined;
    try {
      let modelCatalogPath = options.modelCatalogPath;
      if (options.advisoryModel !== undefined) {
        // model_catalog_json is startup-only in Codex 0.154. A per-thread
        // feature override cannot remove model-advertised patch/clock/input tools.
        const cachePath = join(
          options.codexHome ??
            process.env.CODEX_HOME ??
            join(homedir(), ".codex"),
          "models_cache.json",
        );
        const bytes = await readFile(cachePath);
        if (bytes.byteLength > 2 * 1024 * 1024)
          throw new CodexAppServerProtocolError(
            "CODEX_TOOL_POLICY_UNAVAILABLE",
            "The managed model catalog exceeds its declared budget.",
          );
        const cache: unknown = JSON.parse(bytes.toString("utf8"));
        if (!isRecord(cache) || !Array.isArray(cache.models))
          throw new CodexAppServerProtocolError(
            "CODEX_TOOL_POLICY_UNAVAILABLE",
            "The managed model catalog is unavailable.",
          );
        const matches = cache.models.filter(
          (value: unknown) =>
            isRecord(value) && value.slug === options.advisoryModel,
        );
        if (matches.length !== 1 || !isRecord(matches[0]))
          throw new CodexAppServerProtocolError(
            "CODEX_TOOL_POLICY_UNAVAILABLE",
            "The exact advisory deployment is unavailable in the managed catalog.",
          );
        const model = {
          ...matches[0],
          shell_type: "disabled",
          apply_patch_tool_type: null,
          web_search_tool_type: "text",
          supports_search_tool: false,
          experimental_supported_tools: [],
          tool_mode: "direct",
          include_skills_usage_instructions: false,
          include_plugin_usage_instructions: false,
          include_apps_usage_instructions: false,
        };
        directory = await mkdtemp(
          join(await realpath(tmpdir()), "petra-advisory-catalog-"),
        );
        modelCatalogPath = join(directory, "models.json");
        await writeFile(modelCatalogPath, JSON.stringify({ models: [model] }), {
          mode: 0o600,
        });
      }
      const ownedDirectory = directory;
      const port = new CodexStdioMessagePort({
        ...options,
        ...(modelCatalogPath === undefined ? {} : { modelCatalogPath }),
        ...(directory === undefined ? {} : { cwd: directory }),
      });
      return await CodexSubscriptionProvider.connect(port, {
        ...(options.requestTimeoutMs === undefined
          ? {}
          : { requestTimeoutMs: options.requestTimeoutMs }),
        ...(options.advisoryModel === undefined
          ? {}
          : { advisoryModel: options.advisoryModel }),
        ...(ownedDirectory === undefined
          ? {}
          : {
              cleanup: () =>
                rm(ownedDirectory, { recursive: true, force: true }),
            }),
      });
    } catch (error) {
      if (directory !== undefined)
        await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  diagnostics(): CodexProviderDiagnostics {
    return {
      providerKind: "codex_app_server",
      initialized: this.#initialized,
      transport: "stdio_jsonl",
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      pendingRequests: this.#pending.size,
      pendingServerRequests: this.#pendingServer.size,
      scientificExtractionEligible: false,
    };
  }

  async readAccount(): Promise<CodexAccountSummary> {
    const result = await this.#request("account/read", { refreshToken: false });
    if (!isRecord(result) || typeof result.requiresOpenaiAuth !== "boolean") {
      throw new CodexAppServerProtocolError(
        "CODEX_RESPONSE_INVALID",
        "Codex app-server returned an invalid account summary.",
      );
    }
    if (result.account === null) {
      return {
        authenticated: false,
        authMode: "none",
        planType: null,
        requiresOpenaiAuth: result.requiresOpenaiAuth,
      };
    }
    if (!isRecord(result.account)) {
      throw new CodexAppServerProtocolError(
        "CODEX_RESPONSE_INVALID",
        "Codex app-server returned an invalid account identity.",
      );
    }
    const type = result.account.type;
    const authMode: CodexAccountSummary["authMode"] =
      type === "chatgpt" || type === "apiKey" || type === "amazonBedrock"
        ? type
        : "unknown";
    return {
      authenticated: true,
      authMode,
      planType:
        type === "chatgpt" ? optionalString(result.account.planType) : null,
      requiresOpenaiAuth: result.requiresOpenaiAuth,
    };
  }

  async listModels(): Promise<readonly CodexModelSummary[]> {
    const models: CodexModelSummary[] = [];
    const modelIds = new Set<string>();
    const cursors = new Set<string>();
    let cursor: string | undefined;

    for (let page = 0; page < 10; page += 1) {
      const result = await this.#request("model/list", {
        limit: 100,
        includeHidden: false,
        ...(cursor === undefined ? {} : { cursor }),
      });
      if (!isRecord(result) || !Array.isArray(result.data)) {
        throw new CodexAppServerProtocolError(
          "CODEX_RESPONSE_INVALID",
          "Codex app-server returned an invalid model catalog.",
        );
      }
      if (result.data.length > 100) {
        throw new CodexAppServerProtocolError(
          "CODEX_RESPONSE_INVALID",
          "Codex app-server exceeded Petra's bounded model-catalog page size.",
        );
      }
      for (const value of result.data) {
        if (!isRecord(value)) {
          throw new CodexAppServerProtocolError(
            "CODEX_RESPONSE_INVALID",
            "Codex app-server returned a malformed model entry.",
          );
        }
        const id = nonEmptyString(value.id, "model.id");
        if (modelIds.has(id)) continue;
        modelIds.add(id);
        const efforts = Array.isArray(value.supportedReasoningEfforts)
          ? value.supportedReasoningEfforts.map((effort) => {
              if (!isRecord(effort)) {
                throw new CodexAppServerProtocolError(
                  "CODEX_RESPONSE_INVALID",
                  "Codex app-server returned a malformed reasoning-effort entry.",
                );
              }
              return nonEmptyString(
                effort.reasoningEffort,
                "model.supportedReasoningEfforts.reasoningEffort",
              );
            })
          : [];
        const inputModalities =
          value.inputModalities === undefined
            ? ["text", "image"]
            : Array.isArray(value.inputModalities) &&
                value.inputModalities.every(
                  (modality): modality is string =>
                    typeof modality === "string" && modality.length > 0,
                )
              ? value.inputModalities
              : undefined;
        if (inputModalities === undefined) {
          throw new CodexAppServerProtocolError(
            "CODEX_RESPONSE_INVALID",
            "Codex app-server returned malformed model input modalities.",
          );
        }
        const model = nonEmptyString(value.model, "model.model");
        models.push({
          id,
          model,
          displayName: optionalString(value.displayName) ?? model,
          hidden: value.hidden === true,
          isDefault: value.isDefault === true,
          defaultReasoningEffort: optionalString(value.defaultReasoningEffort),
          supportedReasoningEfforts: efforts,
          inputModalities: [...inputModalities],
          supportsPersonality: value.supportsPersonality === true,
        });
      }

      const nextCursor = optionalString(result.nextCursor);
      if (nextCursor === null) return models;
      if (cursors.has(nextCursor)) {
        throw new CodexAppServerProtocolError(
          "CODEX_RESPONSE_INVALID",
          "Codex app-server repeated a model-catalog cursor.",
        );
      }
      cursors.add(nextCursor);
      cursor = nextCursor;
    }

    throw new CodexAppServerProtocolError(
      "CODEX_RESPONSE_INVALID",
      "Codex app-server exceeded Petra's bounded model-catalog pagination limit.",
    );
  }

  async startManagedLogin(
    type: "chatgpt" | "chatgptDeviceCode",
  ): Promise<CodexManagedLoginResult> {
    if (type !== "chatgpt" && type !== "chatgptDeviceCode") {
      throw new CodexAppServerProtocolError(
        "CODEX_LOGIN_MODE_FORBIDDEN",
        "Petra permits only Codex-managed ChatGPT login modes.",
      );
    }
    const params =
      type === "chatgpt"
        ? {
            type,
            useHostedLoginSuccessPage: true,
            appBrand: "chatgpt",
          }
        : { type };
    const result = await this.#request("account/login/start", params);
    if (!isRecord(result) || result.type !== type) {
      throw new CodexAppServerProtocolError(
        "CODEX_RESPONSE_INVALID",
        "Codex app-server returned an invalid managed-login response.",
      );
    }
    if (type === "chatgpt") {
      return {
        type,
        loginId: nonEmptyString(result.loginId, "loginId"),
        authUrl: managedLoginUrl(
          result.authUrl,
          "authUrl",
          new Set(["chatgpt.com", "auth.openai.com"]),
        ),
      };
    }
    return {
      type,
      loginId: nonEmptyString(result.loginId, "loginId"),
      verificationUrl: managedLoginUrl(
        result.verificationUrl,
        "verificationUrl",
        new Set(["auth.openai.com"]),
      ),
      userCode: nonEmptyString(result.userCode, "userCode"),
    };
  }

  async cancelManagedLogin(loginId: string): Promise<void> {
    await this.#request("account/login/cancel", {
      loginId: nonEmptyString(loginId, "loginId"),
    });
  }

  async startThread(
    request: CodexThreadStartRequest,
  ): Promise<CodexThreadSummary> {
    let config: Record<string, unknown> | undefined;
    if (request.advisoryOnly === true) {
      if (
        this.#advisoryModel === undefined ||
        request.model !== this.#advisoryModel
      )
        throw new CodexAppServerProtocolError(
          "CODEX_TOOL_POLICY_REQUIRED",
          "Advisory input requires a dedicated startup catalog for this exact deployment.",
        );
      if (
        request.ephemeral !== true ||
        request.sandbox !== "read-only" ||
        request.approvalPolicy !== "never"
      ) {
        throw new CodexAppServerProtocolError(
          "CODEX_TOOL_POLICY_REQUIRED",
          "Advisory threads require ephemeral, read-only execution without approvals.",
        );
      }
      const effective = await this.#request("config/read", {
        includeLayers: false,
        cwd: nonEmptyString(request.cwd, "cwd"),
      });
      if (!isRecord(effective) || !isRecord(effective.config)) {
        throw new CodexAppServerProtocolError(
          "CODEX_TOOL_POLICY_UNAVAILABLE",
          "The provider did not expose its effective tool configuration.",
        );
      }
      config = advisoryConfiguration(effective.config);
    }
    const result = await this.#request("thread/start", {
      ...(request.model === undefined ? {} : { model: request.model }),
      cwd: nonEmptyString(request.cwd, "cwd"),
      approvalPolicy: request.approvalPolicy ?? "on-request",
      sandbox: request.sandbox ?? "workspace-write",
      personality: request.personality ?? "friendly",
      serviceName: "petra",
      ...(request.baseInstructions === undefined
        ? {}
        : { baseInstructions: request.baseInstructions }),
      ...(request.developerInstructions === undefined
        ? {}
        : { developerInstructions: request.developerInstructions }),
      ephemeral: request.ephemeral ?? false,
      ...(config === undefined ? {} : { config, developerInstructions: "" }),
    });
    if (!isRecord(result) || !isRecord(result.thread)) {
      throw new CodexAppServerProtocolError(
        "CODEX_RESPONSE_INVALID",
        "Codex app-server returned an invalid thread response.",
      );
    }
    if (
      request.advisoryOnly === true &&
      (!Array.isArray(result.instructionSources) ||
        result.instructionSources.length !== 0 ||
        result.approvalPolicy !== "never" ||
        !isRecord(result.sandbox) ||
        result.sandbox.type !== "readOnly" ||
        result.sandbox.networkAccess === true)
    ) {
      throw new CodexAppServerProtocolError(
        "CODEX_TOOL_POLICY_REFUSED",
        "The provider did not retain the advisory thread's isolated execution policy.",
      );
    }
    return {
      threadId: nonEmptyString(result.thread.id, "thread.id"),
      model: optionalString(result.model),
      modelProvider: optionalString(result.modelProvider),
      cwd: nonEmptyString(result.cwd, "cwd"),
      ...(request.advisoryOnly === true
        ? { advisoryIsolation: "petra.codex-no-tools@1.0.0" as const }
        : {}),
    };
  }

  async startTurn(request: CodexTurnStartRequest): Promise<CodexTurnSummary> {
    const result = await this.#request("turn/start", {
      threadId: nonEmptyString(request.threadId, "threadId"),
      input: [
        {
          type: "text",
          text: nonEmptyString(request.prompt, "prompt"),
        },
      ],
      ...(request.model === undefined ? {} : { model: request.model }),
      ...(request.effort === undefined ? {} : { effort: request.effort }),
      ...(request.outputSchema === undefined
        ? {}
        : { outputSchema: request.outputSchema }),
    });
    if (!isRecord(result) || !isRecord(result.turn)) {
      throw new CodexAppServerProtocolError(
        "CODEX_RESPONSE_INVALID",
        "Codex app-server returned an invalid turn response.",
      );
    }
    return {
      threadId: request.threadId,
      turnId: nonEmptyString(result.turn.id, "turn.id"),
      status: nonEmptyString(result.turn.status, "turn.status"),
    };
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    await this.#request("turn/interrupt", {
      threadId: nonEmptyString(threadId, "threadId"),
      turnId: nonEmptyString(turnId, "turnId"),
    });
  }

  async resolveApproval(
    requestId: CodexRpcId,
    decision: CodexApprovalDecision,
  ): Promise<void> {
    const key = rpcKey(requestId);
    const pending = this.#pendingServer.get(key);
    if (pending === undefined) {
      throw new CodexAppServerProtocolError(
        "CODEX_APPROVAL_NOT_PENDING",
        "The Codex approval request is no longer pending.",
      );
    }
    if (
      pending.method !== "item/commandExecution/requestApproval" &&
      pending.method !== "item/fileChange/requestApproval"
    ) {
      throw new CodexAppServerProtocolError(
        "CODEX_SERVER_REQUEST_UNSUPPORTED",
        `Petra cannot resolve ${pending.method} through the approval boundary.`,
      );
    }
    await this.#port.send({ id: requestId, result: { decision } });
    this.#pendingServer.delete(key);
    this.#emit({
      kind: "server_request_resolved",
      requestId,
      method: pending.method,
      decision,
    });
  }

  onEvent(listener: (event: CodexProviderEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#initialized = false;
    this.#rejectPending(
      new CodexAppServerProtocolError(
        "CODEX_SIDECAR_CLOSED",
        "The Codex app-server sidecar closed before the request completed.",
      ),
    );
    await this.#port.close();
    await this.#cleanup?.();
  }

  async #initialize(): Promise<void> {
    await this.#request(
      "initialize",
      {
        clientInfo: {
          name: "petra",
          title: "Petra Scientific Workbench",
          version: "0.0.0",
        },
        capabilities: { experimentalApi: false },
      },
      true,
    );
    await this.#port.send({ method: "initialized", params: {} });
    this.#initialized = true;
  }

  async #request(
    method: string,
    params: Readonly<Record<string, unknown>>,
    beforeInitialization = false,
  ): Promise<unknown> {
    if (this.#closed) {
      throw new CodexAppServerProtocolError(
        "CODEX_SIDECAR_CLOSED",
        "The Codex app-server sidecar is closed.",
      );
    }
    if (!beforeInitialization && !this.#initialized) {
      throw new CodexAppServerProtocolError(
        "CODEX_NOT_INITIALIZED",
        "The Codex app-server handshake has not completed.",
      );
    }
    const id = this.#nextId;
    this.#nextId += 1;
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(rpcKey(id));
        reject(
          new CodexAppServerProtocolError(
            "CODEX_REQUEST_TIMEOUT",
            `Codex app-server did not answer ${method} within the configured deadline.`,
          ),
        );
      }, this.#requestTimeoutMs);
      this.#pending.set(rpcKey(id), { resolve, reject, timer });
    });
    try {
      await this.#port.send({ method, id, params });
    } catch (error) {
      const pending = this.#pending.get(rpcKey(id));
      if (pending !== undefined) clearTimeout(pending.timer);
      this.#pending.delete(rpcKey(id));
      throw error;
    }
    return result;
  }

  #receive(value: unknown): void {
    if (!isRecord(value)) {
      this.#emit({
        kind: "protocol_error",
        code: "CODEX_MESSAGE_INVALID",
        message: "Codex app-server emitted a non-object message.",
      });
      return;
    }
    const id = rpcId(value.id);
    const method = typeof value.method === "string" ? value.method : undefined;

    if (id !== undefined && method === undefined) {
      const pending = this.#pending.get(rpcKey(id));
      if (pending === undefined) {
        this.#emit({
          kind: "protocol_error",
          code: "CODEX_RESPONSE_UNMATCHED",
          message: "Codex app-server returned an unmatched response.",
        });
        return;
      }
      clearTimeout(pending.timer);
      this.#pending.delete(rpcKey(id));
      if ("error" in value) {
        pending.reject(
          new CodexAppServerProtocolError(
            "CODEX_RPC_ERROR",
            errorMessage(value.error),
          ),
        );
      } else {
        pending.resolve(value.result);
      }
      return;
    }

    if (method !== undefined && id === undefined) {
      this.#emit({ kind: "notification", method, params: value.params });
      return;
    }

    if (method !== undefined && id !== undefined) {
      if (method === "account/chatgptAuthTokens/refresh") {
        void this.#port.send({
          id,
          error: {
            code: -32601,
            message:
              "Petra uses Codex-managed ChatGPT authentication and does not supply or refresh tokens.",
          },
        });
        this.#emit({
          kind: "protocol_error",
          code: "CODEX_EXTERNAL_TOKEN_REQUEST_REFUSED",
          message:
            "Codex requested the experimental external-token flow; Petra refused it.",
        });
        return;
      }
      if (
        method !== "item/commandExecution/requestApproval" &&
        method !== "item/fileChange/requestApproval"
      ) {
        void this.#port.send({
          id,
          error: {
            code: -32601,
            message: `Petra has not enabled the ${method} server-request capability.`,
          },
        });
        this.#emit({
          kind: "protocol_error",
          code: "CODEX_SERVER_REQUEST_UNSUPPORTED",
          message: `Petra refused the unsupported ${method} server request.`,
        });
        return;
      }
      this.#pendingServer.set(rpcKey(id), {
        method,
        params: value.params,
      });
      this.#emit({
        kind: "server_request",
        requestId: id,
        method,
        params: value.params,
      });
      return;
    }

    this.#emit({
      kind: "protocol_error",
      code: "CODEX_MESSAGE_INVALID",
      message:
        "Codex app-server emitted a message without a usable method or id.",
    });
  }

  #failTransport(error: Error): void {
    this.#initialized = false;
    this.#rejectPending(error);
    this.#emit({
      kind: "protocol_error",
      code:
        error instanceof CodexAppServerProtocolError
          ? error.code
          : "CODEX_TRANSPORT_ERROR",
      message: error.message,
    });
  }

  #rejectPending(error: Error): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #emit(event: CodexProviderEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}

export interface CodexEventTranslationContext {
  threadId: string;
  runId: string;
  requestId: string;
  traceId: string;
  workUnitId: string;
  modelRequestId: string;
  now?: () => number;
}

export interface CodexTranslatedEvents {
  agUiEvents: readonly BaseEvent[];
  graphRuntimeEvents: readonly PetraAgentRuntimeEvent[];
}

const eventParams = (event: CodexProviderEvent): Record<string, unknown> =>
  "params" in event && isRecord(event.params) ? event.params : {};

const itemFrom = (params: Record<string, unknown>): Record<string, unknown> =>
  isRecord(params.item) ? params.item : {};

const turnFrom = (params: Record<string, unknown>): Record<string, unknown> =>
  isRecord(params.turn) ? params.turn : {};

const stringFrom = (
  value: Record<string, unknown>,
  key: string,
): string | undefined =>
  typeof value[key] === "string" ? value[key] : undefined;

const toolName = (item: Record<string, unknown>): string => {
  const type = stringFrom(item, "type") ?? "unknown";
  if (type === "mcpToolCall") {
    const server = stringFrom(item, "server") ?? "mcp";
    const tool = stringFrom(item, "tool") ?? "tool";
    return `codex.${server}.${tool}`;
  }
  return `codex.${type}`;
};

const safeItemDetails = (
  item: Record<string, unknown>,
): Record<string, unknown> => {
  const type = stringFrom(item, "type") ?? "unknown";
  const details: Record<string, unknown> = { type };
  for (const key of [
    "id",
    "status",
    "command",
    "cwd",
    "server",
    "tool",
    "path",
    "query",
  ]) {
    const value = item[key];
    if (typeof value === "string") details[key] = value;
  }
  if (Array.isArray(item.changes)) details.changeCount = item.changes.length;
  return details;
};

const approvalDetails = (
  event: Extract<CodexProviderEvent, { kind: "server_request" }>,
): Record<string, unknown> => {
  const params = isRecord(event.params) ? event.params : {};
  const details: Record<string, unknown> = {
    provider: "codex_app_server",
    requestId: event.requestId,
    requestKind: event.method,
  };
  for (const key of [
    "threadId",
    "turnId",
    "itemId",
    "reason",
    "command",
    "cwd",
  ]) {
    if (typeof params[key] === "string") details[key] = params[key];
  }
  if (Array.isArray(params.availableDecisions)) {
    details.availableDecisions = params.availableDecisions.filter(
      (value): value is string => typeof value === "string",
    );
  }
  return details;
};

export class CodexEventTranslator {
  readonly #context: CodexEventTranslationContext;
  readonly #now: () => number;
  readonly #startedMessages = new Set<string>();
  readonly #messageText = new Map<string, string>();
  readonly #startedTools = new Set<string>();

  constructor(context: CodexEventTranslationContext) {
    this.#context = context;
    this.#now = context.now ?? Date.now;
  }

  translate(event: CodexProviderEvent): CodexTranslatedEvents {
    const agUiEvents: BaseEvent[] = [];
    const graphRuntimeEvents: PetraAgentRuntimeEvent[] = [];
    const timestamp = this.#now();
    const metadata = {
      petra: {
        requestId: this.#context.requestId,
        traceId: this.#context.traceId,
        workUnitId: this.#context.workUnitId,
        modelRequestId: this.#context.modelRequestId,
        providerKind: "codex_app_server",
        scientificAuthorityEffect: "none",
      },
    };
    const graph = (
      kind: PetraAgentRuntimeEvent["kind"],
      status: PetraAgentRuntimeEvent["status"],
      summary: string,
      details: Record<string, unknown>,
      source: Partial<PetraAgentRuntimeEvent["source"]> = {},
    ): void => {
      graphRuntimeEvents.push({
        kind,
        occurredAt: timestamp,
        source: {
          adapterId: "petra.codex-app-server",
          providerKind: "codex_app_server",
          ...source,
        },
        status,
        summary,
        details,
        scientificAuthorityEffect: "none",
      });
    };

    if (event.kind === "protocol_error") {
      graph("agent.warning", "failed", event.message, { code: event.code });
    } else if (event.kind === "server_request") {
      const details = approvalDetails(event);
      const requestId = String(event.requestId);
      agUiEvents.push({
        type: EventType.ACTIVITY_SNAPSHOT,
        timestamp,
        metadata,
        messageId: `codex_approval_${requestId}`,
        activityType: "petra.provider.approval",
        content: { ...details, status: "awaiting_user" },
        replace: true,
      });
      graph(
        "agent.approval.requested",
        "awaiting_user",
        "Codex is waiting for an explicit user decision.",
        details,
        {
          ...(optionalString(details.threadId) === null
            ? {}
            : { providerThreadId: optionalString(details.threadId) as string }),
          ...(optionalString(details.turnId) === null
            ? {}
            : { providerTurnId: optionalString(details.turnId) as string }),
          ...(optionalString(details.itemId) === null
            ? {}
            : { providerItemId: optionalString(details.itemId) as string }),
          providerRequestId: requestId,
        },
      );
    } else if (event.kind === "server_request_resolved") {
      const requestId = String(event.requestId);
      const details = {
        provider: "codex_app_server",
        requestId: event.requestId,
        requestKind: event.method,
        decision: event.decision,
      };
      agUiEvents.push({
        type: EventType.ACTIVITY_SNAPSHOT,
        timestamp,
        metadata,
        messageId: `codex_approval_${requestId}`,
        activityType: "petra.provider.approval",
        content: { ...details, status: "resolved" },
        replace: true,
      });
      graph(
        "agent.approval.resolved",
        "completed",
        "The Codex approval request was resolved through Petra.",
        details,
        { providerRequestId: requestId },
      );
    } else {
      const params = eventParams(event);
      const threadId = stringFrom(params, "threadId");
      const turn = turnFrom(params);
      const turnId = stringFrom(params, "turnId") ?? stringFrom(turn, "id");
      const item = itemFrom(params);
      const itemId = stringFrom(params, "itemId") ?? stringFrom(item, "id");
      const source = {
        ...(threadId === undefined ? {} : { providerThreadId: threadId }),
        ...(turnId === undefined ? {} : { providerTurnId: turnId }),
        ...(itemId === undefined ? {} : { providerItemId: itemId }),
      };

      if (event.method === "turn/started") {
        agUiEvents.push({
          type: EventType.RUN_STARTED,
          timestamp,
          metadata,
          threadId: this.#context.threadId,
          runId: this.#context.runId,
        });
        graph(
          "agent.turn.started",
          "running",
          "Codex started an agent turn.",
          { providerStatus: stringFrom(turn, "status") ?? "inProgress" },
          source,
        );
      } else if (event.method === "item/agentMessage/delta") {
        if (itemId !== undefined && !this.#startedMessages.has(itemId)) {
          this.#startedMessages.add(itemId);
          this.#messageText.set(itemId, "");
          agUiEvents.push({
            type: EventType.TEXT_MESSAGE_START,
            timestamp,
            metadata,
            messageId: itemId,
            role: "assistant",
          });
          graph(
            "agent.message.started",
            "running",
            "Codex started an assistant message.",
            {},
            source,
          );
        }
        const delta = stringFrom(params, "delta");
        if (itemId !== undefined && delta !== undefined) {
          this.#messageText.set(
            itemId,
            `${this.#messageText.get(itemId) ?? ""}${delta}`,
          );
          agUiEvents.push({
            type: EventType.TEXT_MESSAGE_CONTENT,
            timestamp,
            metadata,
            messageId: itemId,
            delta,
          });
          graph(
            "agent.message.delta",
            "running",
            "Codex streamed assistant text.",
            { characterCount: delta.length },
            source,
          );
        }
      } else if (event.method === "item/started") {
        const type = stringFrom(item, "type");
        if (type === "agentMessage" && itemId !== undefined) {
          this.#startedMessages.add(itemId);
          this.#messageText.set(itemId, "");
          agUiEvents.push({
            type: EventType.TEXT_MESSAGE_START,
            timestamp,
            metadata,
            messageId: itemId,
            role: "assistant",
          });
          graph(
            "agent.message.started",
            "running",
            "Codex started an assistant message.",
            {},
            source,
          );
        } else if (
          itemId !== undefined &&
          [
            "commandExecution",
            "fileChange",
            "mcpToolCall",
            "dynamicToolCall",
            "collabAgentToolCall",
            "webSearch",
            "imageView",
          ].includes(type ?? "")
        ) {
          this.#startedTools.add(itemId);
          const details = safeItemDetails(item);
          agUiEvents.push(
            {
              type: EventType.TOOL_CALL_START,
              timestamp,
              metadata,
              toolCallId: itemId,
              toolCallName: toolName(item),
            },
            {
              type: EventType.TOOL_CALL_ARGS,
              timestamp,
              metadata,
              toolCallId: itemId,
              delta: JSON.stringify(details),
            },
          );
          graph(
            "agent.tool.started",
            "running",
            `Codex started ${type ?? "a tool"}.`,
            details,
            source,
          );
        }
      } else if (event.method === "item/completed") {
        const type = stringFrom(item, "type");
        if (type === "agentMessage" && itemId !== undefined) {
          const finalText = stringFrom(item, "text") ?? "";
          const streamedText = this.#messageText.get(itemId) ?? "";
          if (!this.#startedMessages.has(itemId)) {
            agUiEvents.push({
              type: EventType.TEXT_MESSAGE_START,
              timestamp,
              metadata,
              messageId: itemId,
              role: "assistant",
            });
            if (finalText.length > 0) {
              agUiEvents.push({
                type: EventType.TEXT_MESSAGE_CONTENT,
                timestamp,
                metadata,
                messageId: itemId,
                delta: finalText,
              });
            }
          } else if (
            finalText.length > streamedText.length &&
            finalText.startsWith(streamedText)
          ) {
            agUiEvents.push({
              type: EventType.TEXT_MESSAGE_CONTENT,
              timestamp,
              metadata,
              messageId: itemId,
              delta: finalText.slice(streamedText.length),
            });
          }
          agUiEvents.push({
            type: EventType.TEXT_MESSAGE_END,
            timestamp,
            metadata,
            messageId: itemId,
          });
          this.#startedMessages.delete(itemId);
          this.#messageText.delete(itemId);
          graph(
            "agent.message.completed",
            "completed",
            "Codex completed an assistant message.",
            {},
            source,
          );
        } else if (itemId !== undefined && this.#startedTools.has(itemId)) {
          agUiEvents.push({
            type: EventType.TOOL_CALL_END,
            timestamp,
            metadata,
            toolCallId: itemId,
          });
          this.#startedTools.delete(itemId);
          graph(
            "agent.tool.completed",
            "completed",
            `Codex completed ${type ?? "a tool"}.`,
            safeItemDetails(item),
            source,
          );
        }
      } else if (event.method === "turn/completed") {
        const status = stringFrom(turn, "status") ?? "failed";
        if (status === "failed") {
          const error = isRecord(turn.error) ? turn.error : {};
          const message = stringFrom(error, "message") ?? "Codex turn failed.";
          agUiEvents.push({
            type: EventType.RUN_ERROR,
            timestamp,
            metadata,
            code: "CODEX_TURN_FAILED",
            message,
          });
          graph(
            "agent.turn.failed",
            "failed",
            message,
            { providerStatus: status },
            source,
          );
        } else {
          agUiEvents.push({
            type: EventType.RUN_FINISHED,
            timestamp,
            metadata,
            threadId: this.#context.threadId,
            runId: this.#context.runId,
            result: { provider: "codex_app_server", status },
            outcome: { type: "success" },
          });
          graph(
            "agent.turn.completed",
            status === "interrupted" ? "interrupted" : "completed",
            status === "interrupted"
              ? "The Codex turn was interrupted."
              : "Codex completed the agent turn.",
            { providerStatus: status },
            source,
          );
        }
      } else if (event.method === "error" || event.method === "warning") {
        const error = isRecord(params.error) ? params.error : params;
        const message =
          stringFrom(error, "message") ?? "Codex reported a runtime warning.";
        graph(
          "agent.warning",
          event.method === "error" ? "failed" : "running",
          message,
          { providerMethod: event.method },
          source,
        );
      }
    }

    return { agUiEvents, graphRuntimeEvents };
  }
}
