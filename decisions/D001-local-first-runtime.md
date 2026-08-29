# D001: Local-first runtime with governed remote adapters

- **Status:** Accepted
- **Accepted:** 2026-08-27
- **Scope:** Private research-workbench phase
- **Revisit:** Only when a recorded trigger in this document is met

## Decision

Petra will be a local-first research workbench with optional, policy-governed remote adapters.

The private workspace will have no mandatory hosted dependency. Papers, source artifacts, personal evidence, unpublished results, graph state, event history, retrieval indexes, credentials, and the authoritative record of model and tool activity will remain under the researcher's local control by default.

Petra may connect to scholarly services, remote language models, hosted compute, and future synchronization services through explicit adapters. Every external request must pass the project's capability, budget, privacy, and data-egress policies.

A future public or collaborative Petra will consume deliberate, redacted, immutable snapshots. It will not receive direct access to the live private graph.

## Context

Petra begins as an individual scientific workbench and may later become a public product. Its working set can include licensed papers, personal notes, unpublished observations, experimental data, prompts, credentials, and model-call records. Those materials have different privacy and licensing requirements and cannot safely be treated as one cloud corpus.

The system also needs selective access to networked services. Scholarly discovery requires external APIs and websites. Some research tasks benefit from remote models or GPUs. Later collaboration may benefit from synchronization or hosting. A strictly offline architecture would obstruct those uses, while a hosted-first architecture would make private research depend on an external service and complicate meaningful data-egress control.

Local-first therefore defines the authority boundary; it does not forbid network use.

## The local trusted core

The following state remains local and authoritative by default:

- canonical works, versions, artifacts, and source spans;
- project questions, claims, assertions, hypotheses, decisions, and experiments;
- `PersonalEvidence` and unpublished observations;
- append-only event history and materialized graph projections;
- lexical, vector, and other retrieval indexes;
- graph change sets, approvals, and rollback history;
- credentials and provider configuration;
- model-call and tool-use records;
- code, environments, run outputs, and experiment artifacts;
- snapshot construction and redaction decisions.

An optional remote service may cache or process selected data only when an applicable policy permits it. The local event history remains the authority for what entered, left, or changed the workspace.

## Governed remote adapters

Remote capabilities are disabled or constrained independently. Initial adapter classes are:

- scholarly metadata and search services;
- publisher, repository, and dataset acquisition;
- remote language and embedding models;
- hosted CPU or GPU execution;
- optional encrypted backup or synchronization;
- publication and external sharing.

An adapter must declare:

- destination and provider identity;
- action and data classes accepted;
- retention and training policy when known;
- network endpoints;
- credentials required;
- expected cost class;
- request and response artifacts Petra will retain;
- capability grant required;
- failure and retry behavior.

An agent role or scientific posture cannot authorize an adapter. Authorization comes from a scoped capability grant.

## Data-egress levels

Every project has an explicit maximum egress level. Individual adapters may impose stricter rules.

### E0 — Local only

No project content leaves the machine. Network access may be disabled entirely. Local models and local execution can still operate when installed.

### E1 — Metadata only

Petra may send bibliographic identifiers, titles, author names, structured filters, and search queries. Full text, private notes, extracted claims, and experimental content remain local.

### E2 — Selected context

Petra may send user-visible, bounded source spans or selected project objects to an approved provider for a specific task. The interface must allow inspection of the outbound context or a precise policy-generated summary before execution.

### E3 — Project context

Petra may send broader project context to an approved provider under a project-specific policy. The grant identifies permitted namespaces, providers, purposes, duration, and budgets.

`PersonalEvidence`, credentials, restricted artifacts, and unpublished experimental data default to E0 even when the surrounding project permits a higher level. Raising their level requires an explicit scoped decision; it is not inherited from the project maximum.

## Offline contract

With previously ingested data and required local models or runtimes installed, Petra should support these operations without a network connection:

- open, search, and inspect existing projects;
- read stored source artifacts and source spans;
- browse and directly edit graph objects;
- review quarantine proposals and apply local change sets;
- run lexical, graph, and locally available vector retrieval;
- create questions, claims, hypotheses, protocols, and notes;
- use approved local models;
- execute approved local experiments;
- inspect events, permissions, prior model calls, costs, and run history;
- reconstruct materialized views and snapshots from local state;
- build an export package for later publication.

The following operations may legitimately require connectivity:

- discovering or acquiring new remote literature and datasets;
- calling remote models or hosted compute;
- resolving identifiers against external services;
- synchronizing or backing up to a remote destination;
- publishing or performing another external action.

The interface must distinguish “network unavailable” from “capability not granted” and “provider failed.”

## Packaging constraint

Local-first must not turn the researcher into a database administrator.

Petra should ship through one installation and update path. Internally it may run a local service, databases, workers, parsers, and sandboxes, but ordinary use should not require the researcher to configure ports, manage containers, migrate schemas manually, or start infrastructure components in a specific order.

The exact application shell and packaging technology are deferred. D001 requires desktop-grade local behavior and a web-capable interface architecture; it does not yet choose between a browser-launched local application, a desktop shell, or another packaging approach.

## External and collaborative boundary

Petra shares bounded research artifacts only through explicit external actions. Each shared artifact pins the graph snapshot, included object revisions, evidence and citation provenance, artifact hashes, rights decisions, applicable redactions, and the model or transformation records needed to inspect it.

Petra does not currently define wholesale project publication or a public graph. If one is justified later, it cannot query the private database, follow live private links, request omitted objects on demand, or inherit private CapabilityGrants.

Collaboration and multi-device synchronization are deferred. If added, they must preserve local authority, explicit conflict handling, event identity, and namespace privacy rather than replacing the private workspace with an opaque hosted state.

## Consequences

### Benefits

- Unpublished research and personal evidence stay under the researcher's control by default.
- Petra remains useful if a model provider, hosted service, or network connection is unavailable.
- Providers can be changed without migrating the authoritative research record.
- Data egress becomes a visible scientific and privacy decision.
- Local code execution and experiment provenance fit naturally into the same workspace.
- External sharing has a clean one-way boundary through explicit snapshot-bound artifacts.

### Costs and risks

- Installation, updates, migrations, backups, and recovery are harder than in a hosted-only application.
- Local hardware varies and may be insufficient for some models, corpora, or experiments.
- Large artifacts and indexes can consume substantial disk space.
- Local-first does not protect data that a researcher explicitly sends to a remote provider.
- Multi-device use and real-time collaboration require later protocol and conflict decisions.
- Supporting multiple operating systems can expand testing and packaging work.

These are product responsibilities, not setup burdens to transfer to the researcher.

## Validation

D001 is satisfied when a minimum Petra workspace can:

1. start and operate without signing into a hosted Petra account;
2. ingest an artifact, create source spans, accept assertions, and rebuild its graph while offline;
3. prevent a remote adapter from receiving data above the project's egress level;
4. show what destination, data class, capability grant, and cost policy govern an external call;
5. continue local work when a remote provider is unavailable;
6. revoke a remote capability and block subsequent calls without damaging local state;
7. export a redacted immutable snapshot that can be inspected without access to the private workspace;
8. install, update, and recover without manual database administration in the supported environment.

## Deferred decisions

D001 does not choose:

- graph, event-store, vector, full-text, or object-storage technologies;
- the desktop shell or frontend framework;
- local model runtimes or remote model providers;
- encryption-at-rest implementation;
- backup, synchronization, or collaboration protocols;
- supported operating systems at public launch;
- artifact retention limits;
- the public hosting platform.

Those choices must respect this boundary but should be evaluated separately.

## Revisit triggers

Reconsider D001 only if evidence shows that one or more of these conditions materially changes Petra's requirements:

- the primary product changes from an individual workbench to synchronous multi-user research;
- required corpora or graph projections cannot operate on target local hardware;
- institutional deployment imposes centralized governance or regulated storage requirements;
- reliable cross-device synchronization becomes necessary for the core workflow;
- local packaging or migration failure prevents acceptable research use;
- remote-only capabilities become indispensable to the minimum scientific contract;
- the threat model shows that a supported local environment cannot protect the intended data classes.

A revisit may change implementation or introduce an optional hosted mode without making the live private graph remotely accessible by default.

## Next decision

D002 will select the physical persistence and projection stack for the first evidence-spine vertical slice. It must implement the logical graph and event contract, run within the local-first boundary, require no routine database administration, and retain a credible migration path as Petra grows.
