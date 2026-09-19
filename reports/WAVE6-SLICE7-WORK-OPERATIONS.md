# Wave 6 slice 7 — Work operations

Date: 2026-09-19 America/New_York

Status: backend implementation complete; the complete named production-command
scenario remains outstanding.

Backend starting commit:
`3eb4c2f5da74d527942a82e59a4ec63eb21a7a40`

Exact counterpart inspected:
`250da82db90007d7c85bd5fbae661c84db5af504`

## Delivered boundary

This slice adds one server-owned Work command/read composition without changing
React, CSS, browser routes, or the frozen Petra interaction hierarchy.

- `GET /api/queries/projects/:projectId/work/:workUnitId/operations` returns a
  snapshot-consistent exact Work reference, current plan, registered required
  inputs, durable delivery/replay paths, eleven distinct operation assessments,
  retained results, and exact result destinations.
- `POST /api/commands/projects/:projectId/work/:workUnitId` executes `start`,
  `answer_input`, `steer`, `prioritize`, `cancel`, and `retry` against an exact
  current WorkUnit revision and specification hash.
- Required input responses are limited to the worker-registered choices and are
  retained once. Steering and priority changes append immutable plan revisions;
  their stated effect boundary is the next queue or successor schedule, so they
  do not pretend to rewrite an already-running attempt.
- Start, cancellation, and retry reuse the canonical WorkUnit authority. Retry
  requires an exact retryable terminal failure, retained input, no pending
  required input, and remaining attempt capacity.
- Detach remains intentionally browser-owned. Reconnect and replay bind the
  latest registered durable interaction run and use the existing durable
  interaction-history routes without initiating another execution.
- Resume and start again return explicit unavailable assessments. Petra does not
  infer checkpoint compatibility or clone prior Work without a registered
  workflow-specific transition and input-rebinding command.
- GroundedResponse results return to Petra. WorkerOutputManifest results return
  to their exact Work result identity. Neither result implies domain authority.

The renderer-neutral `ProjectWorkClient` validates the same read and command
contracts and rejects Project, WorkUnit, command, idempotency, or operation
crossing in a response.

## Authority, persistence, and recovery

CapabilityGrant `1.8.0` adds `ManageProjectWork`. The HTTP route resolves the
authenticated human and exact active grant on the server; a request cannot
choose its Actor or capability identity. PostgreSQL migration V045 retains:

- registered required-input requests and exact responses;
- immutable Work plan revisions and one current plan head;
- pending/completed idempotent operation receipts; and
- the existing canonical WorkUnit lifecycle and attempt history.

A pending receipt reserves one exact command per WorkUnit while an effect is
unknown. Replay reconciles an already-applied input, plan, queue/start, cancel,
or retry effect and completes the same receipt. A completed receipt cannot be
updated or deleted. Conflicting command/idempotency reuse, stale Work or plan
references, unavailable state transitions, unregistered input choices, missing
targets, and denied grants fail without a second effect.

## Operation ledger disposition

`work.start`, `work.answer-input`, `work.steer`, `work.prioritize`,
`work.cancel`, `work.retry`, and `work.open-result` now have complete backend
owners. `work.resume` and `work.start-again` move from missing to partial because
their honest eligibility reads now exist while the workflow-specific mutation
owners do not.

The Wave 6 backend ledger moves from 59 owned / 15 partial / 15 missing / 8
client-owned operations to 66 owned / 14 partial / 9 missing / 8 client-owned
operations. The UI inventory records the runtime owners but preserves every
current UI state and empty evidence list for design slice 8.

Scientific profile `1.1.0` now advertises eligible retry and continues to
identify checkpoint resume and workflow-specific start again as unavailable.
Immutable `1.0.0` remains queryable for existing Projects, while the profile
catalogue selects the latest registered version for new Project choices. The
controlled-writing profile still has no registered Work family and does not
borrow scientific behavior.

## Evidence control

No record is claimed for `UX1.6-WORK/start-input-steer-cancel-retry`. The real
PostgreSQL integration executed required input, priority, steering, idempotent
start, cancellation, retry, explicit resume/start-again assessments, and an
exact retained result. Its WorkUnit had no registered durable interaction run,
so detach/reconnect/replay were assessed honestly but the complete named
production-command scenario was not executed. The evidence array remains
empty.

## Verification

All commands use pinned Node 24.20.0 and npm 11.19.0.

- focused renderer-neutral client and authenticated HTTP route tests;
- contract fixture and generated-type conformance;
- fresh PostgreSQL 18.6 integration migrated V001–V045 and passed all 19 files
  and 166 tests, including the Work command/read scenario;
- operation inventory and backend-owner audit; and
- the complete repository `npm run verify` gate and `git diff --check` are
  required before commit.

## Next safe boundary

Design slice 8 can use `ProjectWorkClient` to deliver the stable URL,
representative reset state, in-product guide, and visible Work controls. It must
render server-supplied availability and recovery, preserve exact Project and
Work identity through detach/reconnect, keep resume/start again unavailable,
and retain the accepted Petra model context binding from slice 6. It must not
infer Work commands from model prose or promote an operation to live without
executed evidence.
