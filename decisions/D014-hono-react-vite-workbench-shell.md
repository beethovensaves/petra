# D014: Hono-first TypeScript server and React/Vite workbench shell

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** M1 TypeScript HTTP server, React application shell, routing mode, local and production topology, AG-UI hosting, framework authority limits, Hono conformance, Fastify fallback, and direct framework cost
- **Depends on:** [D001](D001-local-first-runtime.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md), [D012](D012-scoped-research-artifacts-and-external-adapters.md), [D013](D013-ag-ui-sdk-interaction-boundary.md)
- **Resolves:** `M1.0-DEC03` and `DISC-02`

## Decision

Petra will implement its M1 web boundary with:

- Hono on the supported Node.js runtime through `@hono/node-server`;
- React built with Vite;
- React Router in Data Mode;
- the official AG-UI SDK behind the Petra interaction adapters defined in D013.

Hono is the primary server choice. Fastify is the first fallback only if the Hono implementation fails a recorded M1 conformance requirement. Petra will not build both servers in parallel or keep two production HTTP adapters active.

The production topology is one deployable Node application:

```text
browser
└── React/Vite workbench
    ├── React Router Data Mode
    ├── Petra command/query client
    └── PetraInteractionClient
        └── official AG-UI HttpAgent
                 │
                 ▼
Hono on Node
├── /api/commands/*
├── /api/queries/*
├── /api/interactions/run
├── /api/interactions/:id
├── /api/work-units/:id/cancel
├── /health and diagnostics
└── built Vite assets and SPA fallback
                 │
                 ▼
Petra application core and adapters
```

During development, Vite runs its development server and proxies Petra routes to Hono. Integration and acceptance tests also exercise the built production topology so the development proxy cannot conceal framing, cancellation, caching, or routing defects.

## Why Hono comes first

AG-UI is an M1 requirement, so interaction-stream fit has greater weight than a framework's broader plugin inventory. Hono expresses handlers through Web Standard `Request`, `Response`, and streams. Its streaming helper returns a `Response`, supports piping a readable stream, and exposes abort handling. This is a close semantic match for AG-UI's HTTP and event-stream boundary.

Petra already owns runtime schemas, commands, policies, capability checks, idempotency, durable work, and domain events. Hono's small HTTP abstraction supplies routing, middleware, streaming, and Node hosting without competing for those responsibilities.

Hono's portability is a secondary benefit, not the reason for selection. M1 targets a long-running Node container because Petra uses PostgreSQL, Neo4j, S3-compatible artifact storage, Python workers, and durable streams. Edge deployment is not an M1 goal.

## Framework authority limits

Hono is an HTTP adapter. It does not define Petra's:

- domain or scientific objects;
- command and query contracts;
- runtime-schema authority;
- authorization or `CapabilityGrant` semantics;
- event ledger, WorkUnit, or cancellation semantics;
- AG-UI profile;
- React component model or application state.

Petra will not use Hono RPC as its canonical application contract. It will not use Hono JSX as its workbench framework. Route handlers validate through the canonical Petra schemas selected under `M1.0-DEC04`, establish the request context, call one application command or query, and translate the result.

Hono middleware may perform request identification, authentication, body limits, secure headers, logging, trace propagation, and early rejection. The PolicyEngine remains the final authority for consequential operations.

## React and routing boundary

Petra uses a client-rendered React workbench in M1. Vite provides the development server and production asset build. Hono serves the built assets and SPA fallback in the production topology.

React Router Data Mode owns:

- stable URL routes and parameters;
- route-level data loading;
- navigation and pending state;
- route error boundaries;
- addressable project, question, Hypothesis, paper, evidence, graph, and work views.

React Router does not own authoritative scientific state. Route loaders may query Petra; material mutations use the typed Petra command client. AG-UI interaction state remains behind `PetraInteractionClient`. Temporary layout and editing state remains local unless submitted through a Petra command.

Server-side rendering, React Server Components, React Router Framework Mode, and public search indexing are outside M1. A later public or read-only presentation surface can be evaluated from an actual publication requirement without changing the private workbench's application core.

## AG-UI hosting

The Hono interaction route accepts the validated AG-UI run input and delegates to Petra's server-side interaction adapter. The adapter emits SDK-encoded events; Hono only carries the stream.

Petra must test the official encoder's output before using Hono's `streamSSE` convenience framing. If the SDK already returns framed SSE bytes, Hono must pass or pipe them without adding a second SSE envelope.

Client connection and durable work remain separate:

- aborting or losing the HTTP stream stops delivery to that connection;
- reconnecting reads the persisted `PetraInteractionRun` and replay checkpoint;
- cancelling research invokes an explicit authorized WorkUnit command;
- a route or middleware abort callback cannot silently cancel scientific work.

Errors discovered before response streaming use the normal typed HTTP error path. Errors after the stream begins produce a valid terminal AG-UI event and recorded Petra terminal state; they cannot rely on replacing the already-started HTTP response.

## Hono conformance and Fastify fallback

Hono remains selected when the M1.0 fixture demonstrates all of these behaviors:

| ID | Required Hono behavior | Failure condition |
| --- | --- | --- |
| `D014-HC01` | The official `HttpAgent` completes a run against the Hono route. | Petra needs a client or protocol workaround outside its registered adapter. |
| `D014-HC02` | Official SDK encoding reaches the client byte-correctly and in valid event order. | Hono changes, buffers incorrectly, or double-frames the event stream. |
| `D014-HC03` | Node stream abort, backpressure, write failure, and terminal error are observable and attributable. | The adapter cannot cleanly detect or record connection outcomes. |
| `D014-HC04` | Reconnection and replay preserve thread, run, WorkUnit, interrupt, and command identity. | Retry duplicates or loses an authoritative effect or interaction position. |
| `D014-HC05` | Authentication, body limits, request identity, trace context, and Petra runtime validation execute before application work. | Unvalidated or unauthorized input can reach a command or expensive operation. |
| `D014-HC06` | One trace correlates HTTP request, `PetraInteractionRun`, WorkUnit, ModelRequest, and command where applicable. | Operational diagnosis requires reconstructing unrelated logs manually. |
| `D014-HC07` | Hono serves the Vite production build and SPA fallback without intercepting `/api` or diagnostic routes. | Production requires another application server or ambiguous route precedence. |
| `D014-HC08` | Representative concurrent M1 streams complete within recorded resource and latency envelopes. | A reproducible Hono or Node-adapter limitation materially impairs the M1 workload. |
| `D014-HC09` | Hono remains confined to the workbench HTTP module. | Framework types or context enter Petra core, contracts, workers, or scientific records. |
| `D014-HC10` | Graceful shutdown stops admission, closes connections, and leaves durable WorkUnits in a recoverable state. | Process termination loses or misreports accepted work. |

A Hono failure requires a fixture, observed result, and implementation note naming the failed criterion. Missing familiarity, preference for another plugin ecosystem, or a synthetic throughput ranking without a Petra workload is not a failure.

If a material criterion fails and a bounded repair would weaken Petra's contracts or exceed the adapter's intended scope, Petra activates Fastify as the replacement HTTP adapter. The same routes, runtime schemas, command/query ports, AG-UI profile, React client, fixtures, and acceptance criteria apply. Petra does not redesign the domain around the fallback.

## Cost and licensing

Hono is MIT-licensed and requires no paid Hono service. React, Vite, React Router, and the selected open-source server packages remain pinned software dependencies; their applicable licenses are recorded in the dependency inventory.

The framework adds no separate production service. Hono and the Vite assets share Petra's Node application. Actual operating cost comes from the Node process, active stream resources and bandwidth, logs and interaction traces, databases, artifact storage, workers, and model providers.

Portability cannot be claimed as a cost saving until another runtime passes the same database, driver, stream, worker, and recovery requirements. Petra will not adopt an edge platform merely because Hono supports it.

## Options considered

### Hono on Node with React/Vite

Selected. Its Web Standard streaming boundary fits AG-UI, its server role remains small, and it preserves a simple single-process production topology.

### Fastify on Node with React/Vite

Retained as the first fallback. It offers a mature Node lifecycle, schema and serialization facilities, logging, and a broad official plugin ecosystem, but Petra will first test whether Hono supplies the smaller adequate boundary.

### Next.js

Rejected for M1. Petra does not currently need SSR, search indexing, React Server Components, or a second full-stack application model. A custom server would also add a boundary that does not improve Petra's scientific core.

### React Router Framework Mode or TanStack Start

Deferred. Both add server and build conventions beyond the current need. React Router Data Mode supplies addressable routes and loading behavior while Petra retains control of the backend and bundling boundary.

### Bare Node HTTP

Rejected. It would turn ordinary routing, middleware, errors, limits, and static serving into Petra-maintained infrastructure without improving scientific semantics.

### Hono and Fastify simultaneously

Rejected. Parallel production adapters would double security, streaming, tracing, and acceptance work before Petra has one evidence path.

## Consequences

### Benefits

- The mandatory AG-UI boundary is tested against Web Standard streams from the first scaffold.
- M1 deploys as one ordinary Node application while development retains Vite's fast client loop.
- Petra's core remains independent of Hono, React Router, Vite, and AG-UI.
- The fallback has explicit activation evidence rather than remaining an informal preference.
- Framework license cost is zero under the selected open-source licenses.

### Costs and risks

- Hono's Node adapter is an additional versioned dependency and must be tested with the pinned Node release.
- Hono's intentionally thin validation requires deliberate integration with Petra's canonical runtime schemas.
- Streaming errors after headers are sent require explicit AG-UI terminal-event handling.
- SPA-only M1 delays evidence about SSR or a public read-only surface.
- Keeping Fastify as a fallback requires conformance fixtures that are adapter-neutral.

## M1 validation

D014 is satisfied when:

1. `D014-HC01`–`D014-HC10` pass against pinned Hono, Node, AG-UI, React, Vite, and React Router dependencies;
2. one development command runs Vite with a documented proxy to Hono;
3. one production command runs the built React workbench and all Petra HTTP routes from the Hono Node process;
4. the command, query, and interaction routes invoke ports owned outside the Hono module;
5. Hono RPC, Hono JSX, SSR, and edge-runtime code are absent from the M1 authority path;
6. the dependency inventory records licenses and exact installed versions;
7. any fallback activation cites a failed Hono criterion and shows that Fastify passes the same fixture.

## Revisit triggers

Reconsider D014 if:

- Hono meets a recorded fallback condition;
- the workbench develops a demonstrated SSR, public-indexing, or server-rendering requirement;
- hosted topology requires separate client and API deployments;
- HTTP framework code leaks into core contracts or scientific behavior;
- Node is no longer the appropriate durable application runtime;
- measured production workload requires a different connection, streaming, or deployment model.

## References considered

- [Hono Node.js adapter](https://hono.dev/docs/getting-started/nodejs)
- [Hono streaming helper](https://hono.dev/docs/helpers/streaming)
- [Hono validation](https://hono.dev/docs/guides/validation)
- [Hono repository and MIT license](https://github.com/honojs/hono)
- [AG-UI architecture](https://docs.ag-ui.com/concepts/architecture)
- [AG-UI `HttpAgent`](https://docs.ag-ui.com/sdk/js/client/http-agent)
- [Vite backend integration](https://vite.dev/guide/backend-integration)
- [React Router modes](https://reactrouter.com/start/modes)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify LTS policy](https://fastify.dev/docs/latest/Reference/LTS/)
