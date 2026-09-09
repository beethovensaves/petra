# UX-REQ-010 Project source lifecycle authority

Status: governed backend exclusion, restoration, receipt, and recovery passed;
public command integration and physical deletion remain unavailable
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now has a typed backend authority for excluding a current ProjectSource
from ordinary new Project use and restoring it later. The transition appends a
new immutable ProjectSource revision. It does not rewrite or delete the prior
revision, its canonical Work and WorkVersion, ArtifactManifest, local Artifact,
parsed representation, provenance, dependents, or history.

The command, event, outbox, and receipt contracts are:

- `petra.command-envelope@1.2.0`, with `ExcludeProjectSource` and
  `RestoreProjectSource` commands;
- `petra.domain-event@1.2.0`, with `project_source.excluded` and
  `project_source.restored` events;
- `petra.outbox-record@1.2.0`; and
- `petra.project-source-lifecycle-receipt@1.0.0`.

Each command names the exact expected ProjectSource identity, revision, content
hash, record hash, and status. Exclusion requires `active`; restoration requires
`excluded`. This prevents a preview or command prepared against stale Project
state from being silently applied to a newer source revision.

## Transaction and recovery behavior

`PostgresProjectSourceLifecycleAuthorityRepository` executes the transition in
one serializable PostgreSQL transaction. It:

1. validates the command contract and checks the supplied Actor and capability
   grant through `CommandAuthorizer`;
2. locks the command, idempotency key, Project, ProjectSource, and authority
   positions in deterministic order;
3. validates the local Project and Actor plus the exact current ProjectSource;
4. appends the status-only ProjectSource revision;
5. records the successful command execution, Project event, and registered
   `interface_authority` outbox intent; and
6. records an immutable lifecycle receipt with exact prior, resulting, event,
   preservation, and recovery references.

An exact replay returns the stored receipt and resulting ProjectSource without
applying another transition. Reuse of a command identity or idempotency key for
different content fails closed. Replay revalidates the immutable receipt, its
stored command result, and the exact resulting source revision.

Recovery is an explicit inverse command, not deletion or rollback. An exclude
receipt declares `RestoreProjectSource` against the exact excluded revision; a
restore receipt declares `ExcludeProjectSource` against the exact restored
revision. The original command, event, receipt, and every ProjectSource revision
remain retained.

## Projection boundary

Lifecycle events currently enqueue only `interface_authority`. There is no
registered Neo4j adapter for these event types, so emitting a `neo4j_graph`
outbox record would create work that cannot be processed. The current
relationship view obtains ProjectSource status from PostgreSQL, so this does not
make its lifecycle posture stale. A future graph representation must first
register and test an event adapter before adding that projection target.

## API and design-freeze boundary

No public mutation route or frozen-interface control was added. Existing API
authentication verifies a bearer token but does not bind a request to the exact
Actor and capability grant demanded by the command. Supplying a server-selected
placeholder would weaken the authority model. Public preflight and execution
therefore remain unavailable until that binding is defined.

The existing read-only lifecycle route remains the supported impact and
retention preview. Physical local-copy deletion remains unavailable pending an
accepted dependency-aware retention policy and a separate destructive command.
No CSS, layout, route hierarchy, or component behavior changed.

## Verification

The increment passes:

- 350 TypeScript contract, registry, generation, hash, and fixture cases;
- strict TypeScript and Python type checks plus 25 Python cases;
- 98 real PostgreSQL 18.6 integration cases after Flyway V001 through V024;
  and
- the repository-wide generation, retrieval-floor, formatting, lint, typecheck,
  production-build, and test gate with 683 always-on cases and seven expected
  service-dependent skips.

The PostgreSQL proof covers authorization denial, exclusion, exact preservation,
receipt lookup, idempotent replay, command-identity and idempotency-key conflicts,
stale expected state, compensating restoration, retained revision history,
ordered Project events, and registered outbox delivery intent.

## Remaining work

- define the single-user request-to-Actor and capability-grant authority;
- expose exact preflight and execute routes without changing the frozen surface;
- integrate preview, confirmation, receipt, and recovery into an approved
  frozen-interface slot;
- add explicit replacement and supersession relations;
- register other ProjectDefinition-valid source and dependency adapters; and
- keep physical deletion unavailable until retention policy is accepted.
