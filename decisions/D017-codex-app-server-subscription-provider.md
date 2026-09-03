# D017: Codex App Server as a managed subscription provider

- **Status:** Accepted
- **Accepted:** 2026-09-03
- **Scope:** Codex sidecar lifecycle, ChatGPT subscription authentication, JSON-RPC transport, conversations, approvals, agent-event translation, provider eligibility, credential isolation, and public-hosting limits
- **Depends on:** [D001](D001-local-first-runtime.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D011](D011-experiment-sandbox-and-reproducibility.md), [D013](D013-ag-ui-sdk-interaction-boundary.md)
- **Amends:** D007's provider portfolio and D013's agent-event ingress boundary

## Decision

Petra will treat Codex App Server as a first-class agent provider, distinct from both the OpenAI API adapter and the local open-weight model route.

When enabled, the Petra server starts `codex app-server` as an owned local sidecar, communicates over its default stdio JSONL transport, completes the required `initialize`/`initialized` handshake, and invokes the stable JSON-RPC surface for account state, managed login, threads, turns, interruption, and approvals.

The provider has this boundary:

```text
Petra server
    ↓ starts and owns
Codex App Server sidecar
    ↓ owns OAuth state, refresh, entitlement, and Codex execution
ChatGPT subscription

Codex notifications and requests
    ↓
Petra Codex adapter
    ├── AG-UI interaction events
    └── provider-neutral agent-runtime events
            ↓
      workflow and graph projections
```

Neither translated event path has scientific authority. Agent messages, commands, file changes, tool calls, plans, approvals, and terminal states are runtime observations or command inputs. A Codex event cannot directly create a trusted Claim, Assertion, Hypothesis, ChangeSet, or graph edge.

## Authentication boundary

Petra supports only App Server's managed ChatGPT flows:

- `account/login/start` with `type: "chatgpt"` for browser login;
- `account/login/start` with `type: "chatgptDeviceCode"` for device-code login;
- `account/read` with a credential-free Petra response; and
- `account/login/cancel` for a user-visible pending ceremony.

Codex owns credential persistence and token refresh. Petra will not read, parse, copy, migrate, log, return, or back up Codex credential files or keychain entries. Petra's response contains authentication mode, plan type, and whether login is required; it omits email and any credential material.

The experimental `chatgptAuthTokens` flow is prohibited. Petra does not enable `experimentalApi`, has no external-token login method, and refuses any server request asking Petra to refresh externally managed ChatGPT tokens. The Codex API-key login route is also outside this adapter: Petra's separate OpenAI API provider owns Platform API-key use.

Login URLs are accepted only over HTTPS from the expected ChatGPT or OpenAI authentication hosts. The browser or device-code ceremony is shown to the researcher but not persisted as scientific or model-call provenance.

## Provider meaning

This adapter grants access to Codex capabilities covered by the authenticated ChatGPT account. It is not general Responses API access.

Available models, quotas, service tiers, tools, retention, residency, workspace permissions, and other behavior follow the active Codex entitlement and ChatGPT workspace. Petra records the model and provider reported for each started thread or turn when available, but it does not promise that a subscription alias is stable or exactly replayable.

The three initial execution boundaries remain complementary:

| Boundary | Best initial use | Governing limits |
| --- | --- | --- |
| Codex App Server subscription | Interactive coding, agentic experimentation, code review, and certification-gated scientific roles | ChatGPT entitlement, Codex surface, per-user managed login, agent permissions, and unavailable per-call API pricing |
| OpenAI Responses API | Optional later production calls, explicit API model selection, metered budgets, and service deployment | Platform project, API key, API data policy, and measured token cost; not required by the individual-workbench baseline |
| Local open-weight runtime | E0 data, offline continuity, controlled benchmarking, exact local revision, and future fine-tuning | Local hardware, runtime quality, and role certification |

The Codex route does not replace either of the others.

## Scientific certification

Codex App Server is initially eligible for agentic coding and experimentation infrastructure only. Its diagnostics report `scientificExtractionEligible: false`.

The provider cannot enter the extractor, critic, synthesist, or conversational scientific role merely because Codex is capable or the user's subscription exposes a strong model. Each scientific role must pass D007's versioned Petra certification suite against the exact observable provider configuration, prompt stack, schema, data scope, tool policy, and entitlement conditions.

If Codex later passes extractor certification, it still produces only validated quarantine proposals through the existing ModelGateway and evidence-admission path. It never receives a direct trusted-state adapter. A subscription-backed output and an API-backed output from related OpenAI models are model comparisons, not independent scientific corroboration.

M1.5 requires one subscription-backed Codex model and one local model to earn extractor certification and produce quarantine proposals. It does not require an API key or a Responses API call. A successful generic Codex smoke turn still does not satisfy the extractor gate: the exact structured-output route must pass Petra's scientific certification suite first.

## Conversations and permissions

Petra owns the workspace and interaction policy supplied to App Server:

- the server fixes the workspace root; clients cannot submit an arbitrary `cwd`;
- the first HTTP surface permits only `read-only` or `workspace-write`, never `danger-full-access`;
- approval policy remains explicit and visible;
- command and file-change approval requests are held pending until Petra receives an authenticated user decision;
- unsupported App Server requests fail closed rather than hanging or acquiring an implicit capability; and
- closing Petra closes the sidecar it started.

App Server approvals govern Codex execution. They do not substitute for Petra's scientific ChangeSet, Approval, capability, impact, or review semantics. If a Codex task proposes a scientific change, the output must later enter the same Petra command path used by every other provider.

## Event translation

The adapter maps stable App Server turn, item, message, tool, approval, warning, and completion messages into two outputs:

1. standard AG-UI run, message, tool, activity, and terminal events for the workbench; and
2. provider-neutral `PetraAgentRuntimeEvent` observations for durable workflow and graph-runtime projections.

Every graph-runtime observation declares `scientificAuthorityEffect: "none"`. Translation records provider thread, turn, item, and request identities where available, while Petra request, trace, WorkUnit, and ModelRequest identities remain separate.

Petra does not translate raw reasoning blocks into user-visible assistant text. User-facing rationale, plan summaries, tool activity, and evidence paths may be shown when their explicit event types and Petra language rules permit it; private chain-of-thought is not a product surface.

## Local and hosted deployment

For the individual workbench, the sidecar may reuse the person's existing Codex-managed login. `PETRA_CODEX_APP_SERVER_ENABLED=true` enables it; disabled remains a valid configuration.

A future hosted Petra must not share one developer's subscription session among users or expose local Codex execution in an untrusted public environment. Before hosted activation, Petra must decide and test one of these patterns:

- a per-user local companion with each researcher's own managed Codex session;
- an enterprise-approved identity or access-token arrangement for trusted private infrastructure; or
- the Platform API adapter for server-side multi-user operation.

That deployment decision must follow then-current OpenAI terms, workspace policy, isolation requirements, and observed Petra workflows. D017 does not authorize a public shared-subscription service.

## Validation

D017 is satisfied for its initial adapter slice when Petra can:

1. start and stop an owned `codex app-server` stdio sidecar;
2. complete `initialize` followed by `initialized` before another request;
3. read a credential-free ChatGPT account summary;
4. start browser and device-code managed login without accepting external tokens;
5. start a bounded thread and turn under a server-owned workspace root;
6. stream assistant and tool events into valid AG-UI events;
7. emit provider-neutral agent-runtime events with no scientific-authority effect;
8. surface and explicitly resolve command and file-change approvals;
9. reject malformed, unmatched, oversized, timed-out, unsupported, or experimental protocol behavior visibly;
10. omit raw reasoning events from the assistant stream;
11. keep the provider ineligible for scientific extraction before certification; and
12. complete one live, read-only, no-tool smoke turn through an existing managed ChatGPT session without reading a credential file.

## Deferred work

D017 does not yet select:

- a permanent subscription model or service tier;
- a hosted multi-user Codex identity design;
- Codex certification for a scientific role;
- automatic permission grants;
- App Server experimental APIs, WebSocket transport, or dynamic client tools;
- the final workbench controls for provider, model, effort, sandbox, and approval modes; or
- persistence and replay schemas for the complete Codex event set.

## References considered

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Codex authentication](https://learn.chatgpt.com/docs/auth)
