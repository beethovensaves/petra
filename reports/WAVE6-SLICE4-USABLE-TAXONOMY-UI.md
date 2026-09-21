# Wave 6 slice 4 — usable taxonomy UI

Date: 2026-09-19 America/New_York

Status: design implementation complete; the named usable-profile browser
scenario remains outstanding.

Design starting commit:
`e6137cfde25fd8bdcf81c6418496695c3100416d`

Exact counterpart inspected:
`9b9080bbfdf2243e245bb3609c92b8c011da2afe`

Integrated backend profile-runtime commit:
`a4c7189748b787b97afd33fac07a0d08480bf271`

## Delivered boundary

This slice connects the renderer-neutral `ProjectProfileClient` to production
workbench routes and controls. It does not change profile contracts, server
authority, persistence, migrations, or registered fixtures.

- Projects reads `GET /api/queries/project-profiles`, requires an explicit
  registered selection, and submits Project name, optional description, first
  focus, and the exact profile reference to `POST /api/commands/projects`.
- The Project context and Settings expose an inspectable `/profile` route backed
  by `GET /api/queries/projects/:projectId/taxonomy`.
- The taxonomy presentation includes purpose, terminology, object kinds,
  relationship meanings, source roles, validators, Work families, model roles,
  Review destinations, supported places, and unavailable operations.
- Scientific evidence inquiry and controlled writing retain their exact
  server-supplied labels, purposes, terms, registered actions, limitations, and
  visibly distinct family treatments inside the same Petra grammar.
- Settings exposes additive replacement through
  `POST /api/commands/projects/:projectId/reset`, requires the exact current
  Project revision and explicit confirmation, and returns to the new Brief.
- Registered, Project-authored, and unsupported-profile resolutions have
  separate presentations. Unsupported bindings apply no substitute labels,
  commands, or profile defaults.

## Authority and recovery

Actor and grant identity remain server-owned. The browser supplies only the
contract's command identity, idempotency identity, exact profile reference,
Project fields, Objective statement, and—during reset—the expected Project ID
and revision.

Create and reset retain the same command and idempotency identities when a
person retries without changing the submitted values. Changing the values
prepares a new identity. A failed command keeps the entered values visible and
shows the server error; no success or replacement is inferred.

The shell formerly supplied generic focus, finding, and reference labels when
the ProjectDefinition omitted them. That fallback was removed. The loader now
fails explicitly and states that no substitute term was applied.

## Operation ledger disposition

`project.create`, `taxonomy.bind-project`, and `application.reset` move from
unavailable or missing to partial. `shell.project-map` and
`taxonomy.inspect-profile` remain partial. Their production controls and owners
are present, but the ledger's live rule also requires the named executed browser
record. No evidence was attached in this slice.

## Evidence control

No command in this slice invoked the exact named
`UX1.6-TAXONOMY/usable-profile-ui` scenario through a live browser and retained
its result. Component tests, typed-client request tests, production builds, and
repository gates are verification support only. This slice therefore returns
an empty evidence array and leaves that scenario outstanding.

## Verification

All commands use Node 24.20.0 and npm 11.19.0 from the pinned Node 24
installation.

- focused workbench typecheck;
- 103 focused workbench tests covering the profile presentation, data binding,
  shell mapping, Settings integration, and adjacent surfaces;
- workbench production build and structural UI-operation audit;
- complete repository `npm run verify` gate; and
- `git diff --check`.

## Next safe boundary

Backend Wave 6 slice 5 can expose certified model-role readiness, provider
status, exact Project-context binding, and a live interaction command for the
Petra surface. It must preserve these taxonomy states and must not rewrite the
design-owned profile UI or begin slice 6 model-composer integration.
