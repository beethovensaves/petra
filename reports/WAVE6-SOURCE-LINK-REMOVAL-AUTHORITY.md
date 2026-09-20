# Wave 6 source-link removal authority

## Scope

This bounded backend remediation closes the runtime-owner gap for
`source.remove-project-link`. It preserves the accepted command identity:
**Remove from Project** executes `ExcludeProjectSource`. It does not add a
second source-removal meaning and does not authorize **Delete local copy**.

## Runtime contract

- `GET /api/queries/projects/:projectId/sources/:projectSourceId/link-removal`
  is an authenticated, grant-resolved, repeatable-read preview. It supplies the
  exact current Project, ProjectDefinition, and active ProjectSource refs,
  retained dependency groups, preservation outcomes, command path, and recovery
  path.
- `POST /api/commands/projects/:projectId/sources/:projectSourceId/link-removal`
  accepts only the exact preview-bound request. Actor, capability grant,
  authority time, event identity, receipt identity, and retention results remain
  server-owned.
- `POST /api/queries/projects/:projectId/sources/:projectSourceId/link-removal-recovery`
  distinguishes a confirmed owned effect, an unobserved/unknown effect with an
  exact-request retry, command-identity conflict, and a differently owned
  command.
- The renderer-neutral client validates the same Project, ProjectSource,
  command, preservation, result, and return boundaries for all three calls.

## Authority and persistence

`PostgresProjectSourceLifecycleAuthorityRepository` remains the single owner of
the `ExcludeProjectSource` transition. V055 atomically adds an immutable
exact-context link-removal receipt beside the existing status revision,
command execution, domain event, outbox record, and lifecycle receipt.

The receipt proves that ordinary new use under the ProjectSource link changed
from `active` to `excluded`. It also proves that canonical Work identity,
selected WorkVersion, ArtifactManifest, local Artifact, parsed representation,
dependents, provenance, and immutable history remain retained. Physical byte
deletion requires a separate future retention owner and command.

Stable command and idempotency identities replay the composed receipt after a
process restart. A changed Project, ProjectDefinition, ProjectSource revision,
request body, actor, command identity, or idempotency binding fails closed.

## Delivery status

The inventory entry advances from `unavailable` to `partial`: the production
backend owner and typed client are live, but the design-owned **Remove from
Project** control has not yet been bound to this runtime in the integrated
browser. No `UX1.6-SOURCES` evidence is claimed by this slice because the full
named visible workflow did not execute.

## Verification

- The focused contract, renderer-neutral client, and authenticated server-route
  suite passes six tests.
- `npm run test:postgres:integration` migrates a disposable PostgreSQL 18.6
  store through V055 and passes 183 tests across 25 files.
- `npm run verify` passes the complete repository gate under Node 24.20.0.
- `npm run gate:wave6:user-testable` runs and reports 97 incomplete Wave 6
  operations. `source.remove-project-link` is correctly among them as
  `partial` with missing executed evidence; its remaining control binding and
  visible execution belong to the next design slice.
