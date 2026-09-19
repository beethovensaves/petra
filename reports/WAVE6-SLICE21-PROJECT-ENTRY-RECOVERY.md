# Wave 6 slice 21 — Project entry recovery owner

Date: 2026-09-19

Backend base: `da6a24150180be6c020c1139149591e134e02f5d`

Exact design counterpart: `21d6592e11a368abf942d60f154e87873599e117`

## Bounded result

The first operation-control finding that was both missing from the product and
missing a production owner was `project.recover`. This slice adds the narrow
production owner for unresolved registered-profile Project create/reset
commands. It does not add a generic recovery ledger, universal mutation, or UI
control.

`POST /api/queries/project-profile-command-recovery` accepts the exact original
`petra.project-profile-command-request@1.0.0`. The server validates and hashes
that request, resolves the configured registered human, and reconciles the
command and idempotency identities against the immutable V044 receipt table in
one repeatable-read transaction.

The accepted `petra.project-profile-command-recovery-view@1.0.0` returns:

- `effect_confirmed` with the exact retained receipt and resulting Brief when
  the request, command identity, idempotency identity, and actor all match;
- `outcome_unknown` when no receipt was visible at the observation cutoff,
  without misreporting absence as `no_effect_confirmed`; or
- `unavailable_to_verify` when either identity is already bound to another
  request or actor, without exposing that conflicting result.

Each assessment contains the exact request subject, preservation inventory,
zero or one eligible registered action, observation cutoff, limitations, and an
exact or safe return. An unknown effect may offer only redelivery of the full
exact request through the existing idempotent create/reset command. A confirmed
effect may offer only browser navigation to the receipt-bound Project. The
assessment itself is read-only, content-hashed, and creates no History event or
second command record.

The renderer-neutral `ProjectProfileClient.assessProjectRecovery` verifies the
request hash, response content hash, observation cutoff, receipt binding,
eligible retry identity, and return destination before exposing the result.
Frozen React components, CSS, and browser routes were not changed.

## Operation-control disposition

`scripts/wave6-operation-contract-baseline.json` now classifies
`project.recover` as backend-owned by the recovery query plus the existing
create/reset command owner. `scripts/ui-operation-inventory.json` records that
runtime owner but intentionally keeps the visible operation `missing`: Design
must still add and execute the Recover Project control.

After this slice, the 97-row Wave 6 baseline contains 67 owned, 14 partial,
eight missing, and eight intentionally client-owned operations. This closes one
server-owner gap only.

## Verification

- Pinned Node `24.20.0` and npm `11.19.0`.
- Contract generation check and all 566 contract tests pass.
- Focused renderer-neutral client: 5 tests pass.
- Focused authenticated server routes: 6 tests pass.
- Disposable PostgreSQL 18.6 integration applies and validates V001–V045, runs
  the complete PostgreSQL package suite including unknown/confirmed/conflicting
  Project command recovery, and removes its labeled containers, network, and
  volume.
- The UI-operation inventory audit passes with 116 operations and the updated
  Wave 6 owner counts.
- The complete repository verification gate passes, including generated
  contracts and fixtures, retrieval floor, formatting, lint, type checks,
  production build, 1,411 always-on TypeScript tests, 25 Python tests, 31 wave
  handoff tests, and the UI-operation audit. Seven service-dependent package
  cases remain expected skips in the service-free repository gate; the
  PostgreSQL suite ran separately against the disposable real service above.

## Evidence boundary

No frozen evidence-plan scenario is claimed by this slice. The executed tests
prove the new backend contract and production owner; they do not invoke the
missing browser control, complete an adverse-state guided task, or satisfy
`UX1.6-RECOVERY/adverse-state-task-completion`.

## Next safe boundary

Design can add one bounded Recover Project control that submits the locally
retained exact create/reset request through the typed client, renders the
server-supplied effect, preservation, limitation, action, and return fields,
and invokes only the supplied existing owner. A conflicting assessment must
offer no retry, and an unknown assessment must preserve the exact local request
until the user explicitly chooses its idempotent retry.
