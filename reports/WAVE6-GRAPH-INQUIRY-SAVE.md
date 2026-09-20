# Wave 6 — authenticated Graph question persistence

Status: backend prerequisite passed; browser operation remains partial

Date: 2026-09-19

Backend base: `a2cd9f0d936b77558babebecaf3911e533fda4b6`

Exact design counterpart inspected:
`09cf8698f91548876dcd51f4c42d338663db81bf`

## Bounded result

The production server now owns an authenticated `SaveProjectInquiry` command
for `graph.save-question`. The renderer sends the exact focused-Graph request,
expected graph content hash, local focus or selection, command identity, and
idempotency identity. It cannot send an Actor, capability grant, Objective,
ProjectInquiry role, ProjectDefinition, or result receipt.

The server resolves the authenticated human and active capability grant,
replays the focused query, validates the exact current ProjectDefinition and
registered ProjectInquiry role, and creates one active `ProjectObjective` as
the retained inquiry. The immutable receipt binds the question, request,
snapshot, focus, selection, origin, return destination, role, Objective,
Project, Definition, Actor, and grant. It states that neither the graph
projection nor selection gains domain authority.

Flyway V048 stores the request and receipt beside normalized exact references.
Unique command and idempotency identities, serializable execution, advisory
locks, record hashes, foreign keys, and an immutable-row trigger provide
durable replay and conflict handling. A separate authenticated recovery route
returns the exact receipt when observed, an explicit identity conflict when a
different request owns the identity, or `outcome_unknown` with exact-request
redelivery when no receipt is visible.

The production project-shell adapter wires the command only when both
PostgreSQL and the server-owned focused Graph reader are available. The
representative disposable-store setup now grants the human author the exact
`SaveProjectInquiry` capability. No React component, CSS, or browser route was
changed.

## Production routes

- `POST /api/commands/projects/:projectId/inquiries`
- `POST /api/queries/projects/:projectId/inquiries/save-recovery`

Both routes accept `petra.project-inquiry-save-request@1.0.0`, reject client
authority fields through the closed schema, resolve the principal server-side,
and return `Cache-Control: no-store` results.

## Verification boundary

The focused route suite covers server-owned principal resolution, exact result
binding, rejection of client authority fields, and recovery composition. The
real PostgreSQL suite covers first application, durable replay, immutable
receipt enforcement, confirmed and unknown recovery, command/idempotency
conflicts, invalid selections, and all migrations from an empty store.

- focused server route suite: 3 tests passed;
- real PostgreSQL 18.6 integration: Flyway V001–V048 and 171 tests in 20
  files passed;
- complete `npm run verify`: passed with Node 24.20.0;
- `npm run gate:wave6:user-testable`: correctly remains red with 97
  incomplete milestone-6 operations, including `graph.save-question` pending
  visible Design integration and executed evidence.

No frozen evidence-plan scenario is claimed. The complete Graph browser
scenario also requires visible invocation, expansion, filtering, Details,
exact source, textual parity, correction preview, and exact task return.

## Remaining integration and blockers

Design can replace the disabled `Save exact question to Project` control with
this command and recovery path, render the retained ProjectInquiry outcome,
and preserve the exact origin and return context.

Two live-trace defects remain outside this bounded slice: the representative
profile has no registered focused-Graph v1.1 expansion recipe, and the bounded
graph result omits the open Review member's exact `WorkingRelationship`.
Neither was changed or hidden here.
