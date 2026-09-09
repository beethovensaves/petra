# PostgreSQL command authorization transaction boundary

Status: transaction-aware asynchronous authorization seam passed; canonical
CapabilityGrant registry and authenticated principal resolution remain open
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

PostgreSQL command repositories can now evaluate durable authorization inside
the same database transaction that replays or applies a command. The additive
`PostgresCommandAuthorizer` receives the exact `CommandAuthorizationRequest`
and the transaction's `PoolClient`, and may return either a synchronous or an
asynchronous decision.

The existing core `CommandAuthorizer` remains synchronous and unchanged. This
preserves the small in-memory policy boundary while giving PostgreSQL adapters
the database context required to resolve and lock a future canonical grant.

## Transaction behavior

Both PostgreSQL command authorities now:

1. validate the command envelope;
2. begin the command transaction;
3. acquire their deterministic command-scope locks;
4. await authorization through the same transactional client;
5. check for an exact replay; and
6. apply and commit the command, or roll back on denial or failure.

Authorization still occurs before either replay is returned or new domain
state is applied. A denied request therefore cannot inspect a stored command
result through the command boundary and leaves no committed mutation.

The ProjectSource lifecycle proof also verifies that its authorizer observes
the repository's serializable transaction. The ChangeControl proof executes a
database query through the supplied client before allowing the command.

## Authority boundary

This seam does not invent a grant, infer an Actor from a bearer token, or make
public mutations safe by itself. Petra still needs:

- a canonical immutable CapabilityGrant contract and durable registry;
- explicit grant scope, command, Project, Actor, validity, and revocation
  semantics;
- a single-user authenticated-principal resolver that selects an exact Actor
  and grant without accepting either identity from untrusted request data; and
- integration tests proving grant issuance, denial, revocation, transaction
  ordering, and request binding.

Until those records and bindings exist, the ProjectSource lifecycle and
replacement command routes remain unavailable. No server route, CSS, layout,
component, or other frozen presentation behavior changed.

## Verification

The transaction boundary passes:

- strict TypeScript type checking;
- 99 real PostgreSQL 18.6 integration cases after a clean Flyway V001 through
  V025 migration; and
- the complete generation, retrieval-floor, formatting, lint, typecheck,
  production-build, and test gate with 686 always-on cases and seven expected
  service-dependent skips.
