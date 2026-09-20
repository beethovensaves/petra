# Wave 6 — registered Work checkpoint resume

Date: 2026-09-20 America/New_York

Status: backend implementation complete; visible browser integration remains
design-owned.

Backend starting commit:
`da028ca0f4b6afc71beef0c60cfae33c8b70d01a`

Exact counterpart inspected:
`1e1afaa0c29d28cfaea0869d5b81a75864a5e707`

## Delivered boundary

`work.resume` now has a production backend owner without treating a visible
checkpoint, a client label, or model prose as permission to continue Work.

- A trusted owning service registers compatibility for one exact current
  checkpointed Work revision. Registration binds the retained checkpoint
  Artifact, immutable Work specification, input manifest, workflow version,
  service Actor, attempt, and capability boundary.
- `GET /api/queries/projects/:projectId/work/:workUnitId/operations` exposes
  Resume only when that exact registration exists and no required input is
  pending.
- `POST /api/commands/projects/:projectId/work/:workUnitId/resume` requires the
  server-resolved human `ManageProjectWork` grant plus the exact Work revision,
  specification hash, and checkpoint identity.
- Resume preserves the WorkUnit identity and current attempt. The canonical
  lifecycle moves from `checkpointed` back to `running`; it does not clone Work,
  consume a retry attempt, apply domain authority, or change retained input.
- Separate accepted request and receipt contracts expose the exact transition
  result. The renderer-neutral client rejects crossed Project, Work,
  checkpoint, command, idempotency, or resulting-Work identities.

`work.start-again` remains honestly unavailable. It still needs its own
workflow-specific fresh-input transition and retained-attempt linkage and was
not implemented in this bounded slice.

## Persistence and recovery

Flyway V057 admits canonical checkpointed lifecycle revisions and adds three
immutable PostgreSQL records:

- trusted exact-checkpoint compatibility registrations;
- pending/completed authenticated resume receipts; and
- exact checkpoint-to-running transition lineage.

A lost delivery after the canonical transition is reconciled against the same
Work revision, attempt, and timestamp. Completed command/idempotency replay
returns the same receipt after a server restart. Stale checkpoints, missing
Artifact bytes, changed identity or authority, pending required input,
unregistered compatibility, and conflicting identities fail without a second
transition.

Scientific profile `1.3.0` describes the registered-checkpoint requirement and
no longer advertises resume as globally unregistered. Earlier immutable profile
versions remain available for Projects already bound to them.

## Executed evidence

`npm run test:wave6:work` passed against a fresh disposable PostgreSQL 18.6
store migrated from V001 through V057. The retained
`reports/WAVE6-WORK-PRODUCTION-COMMANDS.json` artifact records:

- unavailable resume before trusted registration;
- available resume after exact compatibility registration;
- authenticated same-Work and same-attempt continuation;
- one immutable registration, receipt, and transition;
- server restart plus exact receipt replay; and
- five retained Work revisions with no duplicate effect.

The named scenario remains bounded to production backend routes and a
renderer-neutral client. It makes no claim that the frozen React Resume control
has been connected or exercised through the browser.

## Verification

All commands use pinned Node 24.20.0 and npm 11.19.0.

- focused contract, Work lifecycle, typed-client, and authenticated-route tests;
- fresh PostgreSQL 18.6 migration and integration suites;
- `npm run verify`;
- `npm run gate:wave6:user-testable` (executed; the cumulative gate still
  reports 97 incomplete operations, including the design-owned visible Resume
  integration); and
- `git diff --check`.

## Next safe boundary

Design can bind the frozen Resume control to the server-supplied availability,
exact checkpoint request, and typed-client result, then execute it through the
production browser path. Backend should next own `work.start-again` as the
remaining Work lifecycle gap, using an explicit workflow-specific fresh-input
registration rather than implicit cloning.
