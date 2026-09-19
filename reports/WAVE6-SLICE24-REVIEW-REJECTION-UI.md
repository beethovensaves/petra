# Wave 6 slice 24 — Review rejection UI

Date: 2026-09-19

Design base: `1bbc0ba7d31630f4b7b1a95d95b3060e7dfb4b88`

Exact backend counterpart: `4251cb1b9e87404ddf1817701c4de218e43217d0`

## Bounded result

The frozen **Reject candidate** control now reads an exact authenticated
rejection checkpoint through `ReviewSessionRejectClient.prepare`. It renders
the server-supplied complete ChangeSet, atomic membership, selected member,
consequences, Actor, grants, and commitment identity before accepting a
required human rationale. The second explicit gesture sends that exact
checkpoint and rationale through `ReviewSessionRejectClient.reject` once.

The client does not choose the Actor, grants, commands, membership, result, or
effect. Apply and Reject retain separate preparation and decision state. Local
edits, member selection, defer/reopen, refresh, separation, and the other
decision are locked while a rejection commitment or unverified observation
must be retained. A changed Review or member invalidates an unsubmitted
checkpoint, and an uncertain rejection cannot be retried from the browser.

The result presents exact command and event progress, the returned rationale,
every Review member outcome, the complete D020 recovery assessment, and the
originating Review return. A rejected outcome continues to render
`Effect: Outcome unknown`; it is never translated to `no_effect`. A partial or
unverified result remains reconciliation-required and directs the person to
reload Review and inspect Recovery.

The browser contract registry now contains the rejection checkpoint, request,
and result dependency closure. `review.reject` advances from `unavailable` to
`live` in the 116-operation inventory without attaching evidence.

No backend contract, server, persistence, migration, command owner, or
authority implementation changed.

## Focused verification

- Pinned Node `24.20.0` and npm `11.19.0`.
- Review rejection and surrounding Review presentation: 33 focused tests pass.
  They cover browser contract registration, authenticated checkpoint
  preparation, exact consequences, one-decision suppression, required
  rationale, rejected member outcomes, `effect: unknown`, exact return, and
  unverified-result reconciliation.
- Workbench typecheck and production build pass.
- The UI-operation inventory audit passes with 116 operations and 45 live
  entries.

## Complete repository gate

`npm run verify` passes on the pinned toolchain outside the filesystem sandbox
so localhost server tests can bind their required ports. Generated contracts
and fixtures, retrieval floor, formatting, lint, TypeScript and Python type
checks, production build, all always-on test suites, wave-handoff tests, and the
UI-operation audit pass. The workbench suite reports 28 files and 316 tests
passed.

## Guided replay finding

The complete disposable-store production-browser replay was invoked with the
Wave 5 cumulative browser observer because it is the current automated guided
route trace. PostgreSQL 18.6 started from empty state, all 46 migrations
applied, scientific and controlled-writing Projects were seeded, and the
production browser opened the workbench URL.

The replay stopped before reaching Review. The production server used by that
trace did not configure `ProjectModelReadinessService`, so
`GET /api/queries/projects/:projectId/model-readiness` returned `503
PROJECT_MODEL_READINESS_UNAVAILABLE` and the Petra route correctly rendered
**ROUTE UNAVAILABLE**. The trace therefore did not execute the rejection
control and is not a passed guided replay or frozen evidence record. Design
must not invent a readiness response or bypass the certified model route to
make this trace pass.

## Evidence boundary

No frozen evidence-plan scenario is claimed. Focused component/controller
coverage and the failed cumulative replay do not execute the complete visible
correction, rejection, defer/reopen, refresh, separation, preparation, Apply,
member-outcome, and exact-return workflow required by
`UX1.6-REVIEW/correct-reject-defer-apply`.

## Next safe boundary

Backend should take the next bounded remediation: make the disposable guided
replay launch the same certified model-readiness and grounded runtime used by
the production Petra route, then replay the stable-URL workflow through the
actual certified model. Preserve this rejection UI and execute Reject through
the browser against the production checkpoint/command routes before attaching
any `UX1.6-REVIEW` evidence.
