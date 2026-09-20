# Wave 6 Project creation production trace

Date: 2026-09-20

Backend base: `13a2609c8882bd98e442732d34a1e53a4a7ecfeb`

Exact design counterpart: `6361112e7e50af0d825df5ade8976a2634f6c225`

## Bounded result

The exact counterpart makes **New Project** visible and binds its form to the
existing renderer-neutral profile client, but `project.create` remains partial
because it had no executed production evidence. This backend-only remediation
adds one focused production trace. It does not change React components, CSS, or
browser routes.

`npm run test:wave6:project-create` starts a fresh disposable PostgreSQL 18.6
store, applies and validates Flyway V001–V058, starts Petra's production HTTP
server on an ephemeral TCP port, and calls it with the authenticated
`ProjectProfileClient` and `ProjectShellClient`.

The trace proves:

- a profile selected from the registered profile collection is copied into one
  exact Project-owned ProjectDefinition;
- the Project, definition, Objective, and current Objective focus all bind the
  receipt's exact identities and hashes;
- the immutable receipt's canonical record hash and request hash match the
  returned receipt and submitted request;
- the receipt and Project shell resolve the exact resulting Brief destination;
- replaying the same command and idempotency key returns the same receipt while
  retaining one resulting Project and one receipt;
- pre-command recovery reports `outcome_unknown`, a safe Projects fallback,
  and only exact idempotent redelivery; post-command recovery reports
  `effect_confirmed` and the exact result; and
- an unrelated Project, definition, and Objective remain byte-for-byte equal.

The retained authority artifact is
`reports/WAVE6-PROJECT-CREATE-AUTHORITY.json`. The `project.create` and
`project.recover` inventory rows cite it because the production trace actually
executes both operations. Their visible-control state is intentionally not
promoted on the backend branch.

## Evidence boundary

This is operation evidence, not a frozen evidence-plan scenario. It does not
invoke **New Project** or **Recover Project** in a browser and does not satisfy
`UX1.6-RECOVERY/adverse-state-task-completion`, usable taxonomy UI evidence, or
the complete guided workflow.

## Verification

- Pinned Node `24.20.0` and npm `11.19.0`.
- Focused renderer-neutral profile client: 5 tests passed.
- Focused authenticated profile HTTP routes: 6 tests passed.
- Fresh disposable PostgreSQL 18.6 production trace: 1 test passed after
  applying and validating Flyway V001–V058; the complete PostgreSQL package
  then passed 185 tests across 25 files, and the labeled containers, network,
  and volume were removed.
- Complete `npm run verify`: passed, including generated contracts and
  fixtures, retrieval floor, formatting, lint, type checks, production build,
  all service-free TypeScript/Python suites, wave-handoff tests, and operation
  inventory validation.
- `npm run gate:wave6:user-testable`: executed and correctly remains red with
  95 incomplete operations on backend `main`. The backend branch still records
  the frozen visual states; at the exact design counterpart, `project.search`
  and `project.resume` are live and the first remaining integrated defect is
  `project.create: state=partial`, now with backend evidence but without an
  executed visible-control artifact.

## Next safe boundary

Design can execute the visible **New Project** path against these production
owners: choose the registered profile, inspect its terms, submit the exact
Project name and first focus, observe the receipt-bound Brief, replay or recover
one unresolved response without duplicating the Project, and retain a browser
artifact. If that trace passes, `project.create` can be promoted from `partial`
to `live`; the backend authority artifact must remain paired with the browser
evidence rather than being treated as visible-control proof.
