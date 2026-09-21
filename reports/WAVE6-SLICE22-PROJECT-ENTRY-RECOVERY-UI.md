# Wave 6 slice 22 — Project entry recovery UI

Date: 2026-09-19

Design base: `a2c93e46496e756cbb3ee70de4a75118fe04a7b2`

Exact backend counterpart: `991a276ffea4a32b8c7e005eb277635cedc98aec`

## Bounded result

The Projects creation panel and the registered-profile reset panel now retain
the exact submitted `petra.project-profile-command-request@1.0.0` in the browser
session when their command does not return a receipt. The visible **Recover
Project** control submits that same request to
`ProjectProfileClient.assessProjectRecovery`; checking recovery does not replay
the command.

The product renders the server-supplied effect meaning, observation cutoff,
preservation inventory, limitations, eligible action reason and effects, and
exact or safe return. Confirmed effects expose only the supplied browser
navigation. Unknown effects expose only explicit redelivery of the retained
request through the existing idempotent create/reset owner. A conflicting
assessment has no action and therefore no retry control. Failed assessment or
redelivery keeps the exact request available rather than implying success.

The browser contract registry now includes the accepted recovery view so the
production bundle validates the response before presentation. No backend
contract, server, persistence, migration, or authority implementation changed.

`project.recover` is now recorded as a live production control in the
UI-operation inventory. Its evidence array remains empty because this slice did
not execute any named frozen evidence-plan scenario.

## Focused verification

- Pinned Node `24.20.0` and npm `11.19.0`.
- Project profile recovery presentation and production data binding: 12 tests
  pass. These cover read-only assessment before replay, exact-request reuse,
  unknown-effect retry, confirmed-effect navigation, conflicting-effect
  no-retry behavior, preservation, limitations, action effects, and exact/safe
  returns.
- Workbench typecheck and production build pass.
- UI-operation inventory audit passes with 116 operations; `project.recover`
  advances the ledger from missing to live without attaching evidence.

## Complete repository gate

`npm run verify` passes on the pinned toolchain, including generated contracts
and fixtures, retrieval floor, formatting, lint, type checks, production build,
the complete always-on test suite, wave handoff tests, and the UI-operation
audit.

## Evidence boundary

No frozen evidence-plan scenario is claimed. Focused automated tests verify the
new control boundary but do not execute the complete adverse-state guided task
required by `UX1.6-RECOVERY/adverse-state-task-completion`.

## Next safe boundary

Backend can take the second severity-ordered remediation and clean-start replay
from the updated inventory. It should preserve this design-owned control and
must not count its focused tests as frozen scenario evidence.
