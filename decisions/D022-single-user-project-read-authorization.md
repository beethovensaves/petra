# D022: Single-user Project read authorization

- **Status:** Accepted
- **Accepted:** 2026-09-13
- **Scope:** M1 authenticated reads, Project scoping, Actor references, and command grants
- **Depends on:** [D001](D001-local-first-cloud-optional.md), [D007](D007-model-gateway-role-registry-and-routing.md), [D012](D012-scoped-research-artifacts-and-external-adapters.md), [D018](D018-project-definition-and-checkpoint-boundary.md)

## Decision

For Petra's single-user M1 runtime, successful server bearer authentication plus
an exact Project-scoped query is the read-authorization boundary. A reader must
verify that every returned canonical record belongs to the requested Project or
is an exact permitted dependency of that Project. Cross-Project records fail
closed.

Actor identities on records are provenance and display identities within this
boundary. Readers validate their canonical shape and retained record bindings
when those records are available. They do not require an Actor-specific read
grant, infer visibility from Project authorship, or treat a command capability
as read permission.

`PostgresSingleUserCommandPrincipalResolver` remains limited to typed mutation
commands. CommunicationPlan and other read composition must not call it merely
to establish visibility. When a read also exposes a currently executable
action, the action's existing owner still resolves and revalidates the exact
Actor and capability grant before execution.

## Communication composition

The first CommunicationPlan may compose authenticated canonical records under
this boundary in one repeatable-read Project snapshot. It must validate exact
Project IDs, record identities, revisions, hashes, and owned links. An Actor
reference can establish who produced or performed a recorded act; it cannot
establish permission, approval, current eligibility, or scientific authority.

A missing or invalid Actor record is an integrity failure for a required
attribution. It is not repaired by the authenticated user's identity, a command
grant, an ambient thread participant, or a display label.

This read boundary does not authorize external disclosure. Model and adapter
egress continue to require their existing visibility, data-class, capability,
and policy checks.

## Deferred multi-user boundary

Member-specific visibility, shared Projects, invitations, roles, and per-record
access control remain outside M1. Before Petra admits any of them, it must add a
versioned read-authorization policy and apply it consistently to source reads,
composed views, counts, catalogues, cursors, caches, exports, model context, and
historical access. That later policy cannot reinterpret M1 command grants as
read grants or silently broaden previously retained visibility.

## Consequences

- Existing authenticated Project reads retain their accepted M1 meaning.
- Actor provenance remains exact without inventing a second authorization
  mechanism for one communication view.
- Read access and mutation authority stay separate and auditable.
- CommunicationPlan implementation can proceed without fabricating a member or
  Actor visibility rule.
