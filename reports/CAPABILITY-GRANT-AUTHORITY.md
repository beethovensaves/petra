# CapabilityGrant authority

Status: immutable Project-command grants, retained revocation, transactional
authorization, effective-controls composition, and the single-user principal
resolver passed; public grant/lifecycle commands remain open
Date: 2026-09-08
Design boundary: `UX-DESIGN-FREEZE-01`

## Result

Petra now has a canonical authority for deciding whether one exact Actor may
execute one exact registered command in one Project. The contracts are:

- `petra.capability-grant@1.0.0`; and
- `petra.capability-grant-revocation@1.0.0`.

A grant is an immutable revision-one record. It binds one Project, one grantee
Actor, a nonempty set of exact registered command names, its validity window,
the issuing human, the issuance time, and a rationale. Wildcards are invalid.
Changing any permission requires another grant identity; an existing grant ID
cannot acquire broader meaning.

Revocation is a separate immutable revision-one record. It pins the exact grant
revision, content hash, and record hash and does not delete or rewrite the
grant. Reauthorization requires a new grant identity rather than restoration of
the revoked record.

## Single-user authority boundary

This version follows Petra's accepted single-user boundary: only the human
Actor recorded as the Project creator may issue or revoke that Project's grant.
The owner may grant commands to itself or to another registered human, service,
or model Actor; service and model Actors cannot self-issue authority. Multi-user
delegation, role inheritance, and collaborative grant administration remain out
of scope.

The registry is an internal persistence/bootstrap authority, not a public
mutation API. Grant issuance and revocation do not yet have typed command,
event, receipt, or recovery paths. That keeps the implemented command boundary
strict without pretending that grant administration is ready for the frozen
interface.

## Persistence and command authorization

PostgreSQL V026 stores grants and revocations as immutable, schema-versioned,
hash-checked records with exact Project and Actor foreign keys. Repository
registration is serializable and idempotent for the same canonical record. It
rejects identity rebinding, missing Actors or Projects, non-owner issuers,
invalid content hashes, impossible validity windows, future issuance or
revocation claims, stale grant references, and a second revocation for the same
grant.

`PostgresCapabilityGrantCommandAuthorizer` evaluates the grant inside the
owning command transaction. It fails closed unless the grant ID, Project,
Actor, command, validity window, canonical payload, and revocation state all
match. Authorization holds a shared lock on the grant. Revocation registration
takes the conflicting exclusive lock, so a revocation cannot cut through an
already-authorized command transaction, and every later command observes the
revocation.

## Effective controls

The existing Project effective-controls reader now composes retained grants and
revocations in its repeatable-read snapshot. It reports exact allowed commands,
grantee, validity, effective/expired/revoked posture, immutable origin, and
retained history. A Project with no grant is `unavailable`, not `unsupported`:
the authority exists, but no permission is inferred.

RoutingPolicy, BudgetProfile, and ReviewPolicy remain honestly unsupported.
This grant version covers registered Project commands only; remote-provider,
tool, data-egress, cost, and other capability scopes still require their owning
contracts.

## Authenticated principal and design-freeze boundary

`PostgresSingleUserCommandPrincipalResolver` binds a server-configured canonical
human Actor to exactly one active, unrevoked grant for the requested Project
and exact command. Callers supply only the Project and command: they cannot
select an Actor or grant. An absent registered Actor, no eligible grant, or two
eligible grants fails closed. The owning command transaction must still
revalidate the resolved exact grant, so expiry or revocation between resolution
and execution cannot authorize a command.

`PETRA_LOCAL_ACTOR_ID` remains optional for read-only operation. When it is set,
Project-shell persistence validates the canonical Actor ID and makes the
resolver available to the server. The authenticated ProjectSource lifecycle
command route now uses that binding and rejects request-carried Actor, grant,
Project, correlation, or submission fields. Grant issuance and revocation
remain internal and are not public routes.

No CSS, layout, route hierarchy, component contract, or other frozen design
behavior changed. The already-live effective-controls route returns the newly
truthful capability section through its existing contract.

## Verification

The increment passes:

- 359 TypeScript contract, registry, generation, hash, and fixture cases;
- strict TypeScript and Python type checks plus 25 Python cases;
- 105 real PostgreSQL 18.6 integration cases after a clean Flyway V001 through
  V026 migration; and
- the complete generation, retrieval-floor, formatting, lint, typecheck,
  production-build, and test gate with 698 always-on cases and seven expected
  service-dependent skips.

The database proof covers exact issuance and idempotency, identity immutability,
Project-owner authority, missing grantees, validity and transaction-time checks,
command/Actor/Project scope denial, exact retained revocation, stale provenance,
duplicate revocation denial, authorization/revocation serialization, denial
after revocation, and effective-controls composition.

## Remaining work

- add typed issuance and revocation administration only when its event, receipt,
  and recovery semantics are accepted;
- integrate ProjectSource lifecycle preflight, confirmation, receipt, and
  recovery into the frozen interface without weakening the command boundary;
- add provider, tool, egress, budget, and other grant scopes through separate
  owning contract versions; and
- add composed causal History and the applicable `UX-FX32`/`UX-FX33` evidence.
