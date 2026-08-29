# D013: AG-UI SDK at the Petra interaction boundary

- **Status:** Accepted
- **Accepted:** 2026-08-28
- **Scope:** Production AG-UI dependency, client and server integration, Petra protocol profile, state and authority boundaries, event persistence, interruption and resumption, and M1 conformance testing
- **Depends on:** [D001](D001-local-first-runtime.md), [D005](D005-trusted-graph-review-and-direct-editing.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D008](D008-graph-guided-execution-context-and-cost.md), [D009](D009-object-centered-research-workspace.md), [D012](D012-scoped-research-artifacts-and-external-adapters.md)
- **Amends:** D009's provisional AG-UI evaluation boundary
- **Implemented for M1 by:** [D014](D014-hono-react-vite-workbench-shell.md)

## Decision

Petra will use the official AG-UI SDK as a production interaction dependency from M1. It will not hand-roll the protocol or defer the integration until after the scientific workbench exists.

The integration is headless and Petra-owned:

```text
official AG-UI SDK
        ↓
Petra protocol adapters
        ↓
typed Petra interaction model
        ↓
Petra hooks, components, commands, and projections
```

The React workbench uses the official AG-UI client behind a `PetraInteractionClient`. The TypeScript server uses official AG-UI types and encoding support behind a server-side interaction adapter. Petra pins the installed SDK versions and records protocol compatibility in fixtures.

Petra will not initially depend on CopilotKit. Its components may be evaluated later, but neither CopilotKit nor AG-UI defines Petra's visual design, workspace structure, scientific semantics, application state, or authority model.

Petra keeps two coordinated application paths:

1. **Commands and queries:** deterministic reads and runtime-validated mutations through Petra's application boundary.
2. **AG-UI interaction:** streamed assistant conversation, activity, tool proposals, interruption, resumption, and synchronized interface projections.

Both paths reach the same server-side policies and application commands. AG-UI does not create a second mutation path.

## Why AG-UI begins in M1

The interaction protocol affects run identity, progressive rendering, tool mediation, review interruption, reconnection, cancellation, state synchronization, and trace persistence. Adding it after the workbench would force Petra either to replace an earlier bespoke stream or preserve two incompatible interaction models.

Starting with the SDK lets M1 test the real boundary while the surface is still small. Petra can then evaluate protocol overhead and semantic fit through executable fixtures rather than a later migration.

## Petra AG-UI profile

Petra uses stable AG-UI lifecycle, text, tool, activity, state, interruption, and resumption behavior where it fits. Petra-specific interface events use a versioned, namespaced allowlist rather than overloading standard event meanings. Initial examples include:

- `petra.work_unit.status`;
- `petra.proposal.created`;
- `petra.changeset.updated`;
- `petra.evidence_packet.ready`;
- `petra.projection.lag`;
- `petra.provenance.focus`.

Every custom event declares its Petra schema name and version. Experimental or draft AG-UI features cannot become M1 requirements. Their later adoption requires a bounded compatibility test and an explicit need.

Petra exposes research rationale, evidence paths, plans, tool activity, validation, and decision state. It does not request, store, or display private chain-of-thought as an interaction feature.

## Semantic mapping

| AG-UI concept | Petra interpretation | Authority limit |
| --- | --- | --- |
| Thread | Conversation thread associated with a project context | Never substitutes for Project or graph identity |
| Run | `PetraInteractionRun` linked to a WorkUnit and, where applicable, an AgentRun | Does not establish scientific authority |
| Message | Conversational rendering linked to Petra objects and evidence | Prose is not trusted graph state |
| Activity | Visible retrieval, analysis, validation, projection, or composition stage | Reports work; it does not approve it |
| Tool call | Proposed or executing typed operation | Arguments remain untrusted until complete, validated, authorized, and executed server-side |
| State snapshot or delta | Disposable interaction and interface projection carrying an authoritative revision reference | Cannot mutate scientific state, policy, capability, budget, or approval directly |
| Interrupt | Request for clarification, review, approval, correction, or budget escalation | The response becomes command input; the PolicyEngine and ChangeSet path decide its effect |
| Capability discovery | Description of supported interaction features | Never grants a Petra `CapabilityGrant` |
| Serialized event stream | Replayable interaction trace | Never replaces PostgreSQL domain events or graph provenance |
| Custom event | Versioned, allowlisted Petra interface event | Cannot become an untyped authority escape hatch |

`CapabilityGrant` remains Petra's authorization term. AG-UI feature discovery is named `InteractionFeatureManifest` inside Petra code and documentation wherever the distinction would otherwise be ambiguous.

## State and authority

AG-UI shared state contains only disposable or reconstructable interaction state, such as:

- selected object references and authoritative revisions;
- active panel or focused evidence path;
- partial assistant rendering;
- current interaction status and visible activity;
- an unsubmitted review or clarification form.

It does not contain the sole copy of a Claim, Assertion, Hypothesis, ChangeSet, Approval, CapabilityGrant, budget decision, WorkUnit outcome, or graph mutation.

Authoritative changes remain:

```text
AG-UI input or interrupt response
        ↓
Petra command proposal
        ↓
runtime validation
        ↓
policy, capability, revision, and idempotency checks
        ↓
domain event and authoritative state
        ↓
interface and graph projections
```

Direct manipulation and assistant-mediated review resolve to the same command and ChangeSet semantics. An AG-UI interrupt can present or gather a decision; it cannot approve its own consequence.

## Client and server containment

The workbench imports AG-UI through a narrow integration module. Feature components consume Petra hooks and view models such as `useResearchConversation`, `useWorkUnitProgress`, and `useReviewInterrupt`; they do not parse generic protocol events.

The server interaction adapter:

- accepts and validates the AG-UI run input;
- establishes actor, project, capability, privacy, and budget context;
- maps the run to a `PetraInteractionRun` and any associated WorkUnit;
- translates application activity into standard or registered Petra events;
- converts completed tool or interrupt input into Petra command proposals;
- records correlation, revision, visibility, redaction, and terminal state;
- refuses incomplete, stale, unauthorized, or unregistered input.

Petra's core does not import AG-UI types. Translation occurs at the adapter boundary in both directions.

## Durability, cancellation, and replay

A client connection and a durable WorkUnit have separate lifecycles. Closing or aborting an interaction stream stops delivery to that connection; it does not silently cancel scientific work. Cancellation requires an explicit, authorized Petra command.

Petra records enough of each interaction stream to:

- reconnect to a running interaction;
- rebuild the latest interface projection;
- explain which messages and activities were displayed;
- correlate an interrupt response with the command and ChangeSet it produced;
- detect duplicate or out-of-order delivery;
- retain failed and terminal outcomes.

Interaction-stream compaction may reduce presentation history. It cannot delete or rewrite authoritative domain events, model traces, WorkUnit results, approvals, provenance, or scientific artifacts.

## Options considered

### Official AG-UI SDK behind Petra adapters

Selected. Petra receives the protocol's client, event, encoding, interruption, and compatibility infrastructure while retaining its own scientific and interface semantics.

### Hand-written AG-UI-compatible transport

Rejected for M1. Reimplementing an adopted protocol would add parser, ordering, resumption, and compatibility work without improving Petra's scientific boundary.

### Expose AG-UI types directly throughout the workbench and core

Rejected. Protocol types would become accidental domain and state models, increasing replacement cost and weakening Petra's authority distinctions.

### Adopt CopilotKit as the workbench framework

Deferred. Petra needs an object-centered scientific workbench rather than a framework-defined chat experience. CopilotKit may be evaluated later for bounded components that preserve Petra's contracts.

### Defer AG-UI until after M1

Rejected. Streaming, interruption, reconnection, and tool mediation would otherwise be designed twice or retrofitted across an already coupled interface.

## Consequences

### Benefits

- M1 exercises the production interaction contract instead of a disposable placeholder.
- Standard lifecycle, streaming, interruption, and resumption behavior removes avoidable protocol plumbing.
- Petra retains a model-agnostic and UI-specific interaction layer.
- A visible adapter gives conformance, overhead, authorization, and replay failures one testable location.
- Future AG-UI-compatible clients can connect without receiving direct access to Petra authority.

### Costs and risks

- Petra assumes an SDK dependency and must track compatible protocol versions.
- Translation adds types and tests at the client and server boundaries.
- Standard state and tool concepts can appear more authoritative than they are unless naming and validation remain strict.
- Custom events can fragment compatibility if Petra adds them without restraint.
- A protocol optimized for interaction may not cover every long-running scientific workflow without Petra extensions.

Petra contains these risks through pinned dependencies, a small registered profile, domain independence, deterministic commands, server-side authorization, and replay fixtures.

## M1 validation

D013 is satisfied when M1 can demonstrate:

1. one official-client run through the Petra adapter using a pinned SDK;
2. standard run, text, activity, tool, state, and terminal events in valid order;
3. one versioned Petra custom event without exposing an unregistered payload;
4. one assistant-mediated review interrupt that reaches the same ChangeSet command as direct review;
5. rejection of incomplete, stale, malformed, or unauthorized tool and interrupt input;
6. reconnection or replay without duplicating a command, WorkUnit result, or ChangeSet application;
7. explicit cancellation of durable work, distinct from connection abort;
8. recovery of authoritative state without replaying the interaction stream as a domain ledger;
9. protocol types absent from Petra's core package;
10. measured event, latency, and bundle overhead recorded for the M1 flow.

## Deferred decisions

D013 does not itself choose:

- the final TypeScript server or React application framework, now resolved for M1 by D014;
- the exact SDK version before dependency installation and compatibility verification;
- WebSocket or another transport when the M1 HTTP stream is sufficient;
- CopilotKit components;
- draft AG-UI features or a generative-UI specification;
- public AG-UI endpoints, multi-user tenancy, or third-party client support.

## Revisit triggers

Reconsider the dependency or profile if:

- the adapter cannot preserve Petra's authority, revision, privacy, and permission boundaries;
- supported SDK changes repeatedly break pinned conformance fixtures;
- required Petra extensions become broader than the standard protocol surface;
- measured overhead materially harms the local-first interaction target;
- reconnect, interrupt, or cancellation semantics cannot represent durable scientific work safely;
- a smaller maintained protocol implementation demonstrates lower lifecycle cost without losing interoperability.

Removing AG-UI replaces only the interaction adapters and workbench integration module. Petra commands, domain events, scientific objects, WorkUnits, and projections remain unchanged.

## References considered

- [AG-UI overview](https://docs.ag-ui.com/introduction)
- [AG-UI architecture](https://docs.ag-ui.com/concepts/architecture)
- [AG-UI events](https://docs.ag-ui.com/concepts/events)
- [AG-UI state management](https://docs.ag-ui.com/concepts/state)
- [AG-UI interrupts](https://docs.ag-ui.com/concepts/interrupts)
- [AG-UI serialization](https://docs.ag-ui.com/concepts/serialization)
- [AG-UI capabilities](https://docs.ag-ui.com/concepts/capabilities)
- [AG-UI JavaScript client](https://docs.ag-ui.com/sdk/js/client/overview)
- [AG-UI `HttpAgent`](https://docs.ag-ui.com/sdk/js/client/http-agent)
- [Official AG-UI repository](https://github.com/ag-ui-protocol/ag-ui)
