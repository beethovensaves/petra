import {
  CodexEventTranslator,
  CodexSubscriptionProvider,
} from "@petra/adapters/server";

const completionMarker = "PETRA_CODEX_SIDECAR_OK";
const provider = await CodexSubscriptionProvider.startSidecar({
  cwd: process.cwd(),
  requestTimeoutMs: 30_000,
});

try {
  const account = await provider.readAccount();
  if (!account.authenticated || account.authMode !== "chatgpt") {
    throw new Error(
      "No managed ChatGPT session is available. Start Petra's chatgpt or chatgptDeviceCode login flow first.",
    );
  }

  const thread = await provider.startThread({
    cwd: process.cwd(),
    approvalPolicy: "never",
    sandbox: "read-only",
    personality: "pragmatic",
    ephemeral: true,
    developerInstructions:
      "Do not use tools. Return only the exact marker requested by the user.",
  });
  const translated = [];
  const graphEvents = [];
  let finished;
  const completion = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error("The Codex smoke turn did not complete in 60 seconds."),
        ),
      60_000,
    );
    finished = (event) => {
      if (
        event.kind === "notification" &&
        event.method === "turn/completed" &&
        event.params?.threadId === thread.threadId
      ) {
        clearTimeout(timer);
        resolve();
      }
    };
  });
  const translator = new CodexEventTranslator({
    threadId: "petra_codex_smoke_thread",
    runId: "petra_codex_smoke_run",
    requestId: "petra_codex_smoke_request",
    traceId: "petra_codex_smoke_trace",
    workUnitId: "petra_codex_smoke_work_unit",
    modelRequestId: "petra_codex_smoke_model_request",
  });
  const unsubscribe = provider.onEvent((event) => {
    finished?.(event);
    const batch = translator.translate(event);
    translated.push(...batch.agUiEvents);
    graphEvents.push(...batch.graphRuntimeEvents);
  });

  const turn = await provider.startTurn({
    threadId: thread.threadId,
    prompt: `Reply exactly ${completionMarker}. Do not use tools.`,
    effort: "low",
  });
  await completion;
  unsubscribe();

  const assistantText = translated
    .filter((event) => event.type === "TEXT_MESSAGE_CONTENT")
    .map((event) => event.delta ?? "")
    .join("");
  if (!assistantText.includes(completionMarker)) {
    throw new Error(
      "The managed Codex turn completed without the expected marker.",
    );
  }
  if (graphEvents.some((event) => event.scientificAuthorityEffect !== "none")) {
    throw new Error("A Codex runtime event claimed scientific authority.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        account: {
          authMode: account.authMode,
          planType: account.planType,
        },
        deployment: {
          model: thread.model,
          modelProvider: thread.modelProvider,
        },
        turn: { status: "completed", turnIdPresent: turn.turnId.length > 0 },
        translation: {
          agUiEvents: translated.length,
          graphRuntimeEvents: graphEvents.length,
          scientificAuthorityEffect: "none",
        },
      },
      null,
      2,
    ),
  );
} finally {
  await provider.close();
}
