# Wave 6 source local-copy deletion authority

## Scope

This bounded backend remediation closes the production runtime-owner gap for
`source.delete-local-copy`. It remains separate from
`source.remove-project-link`: deletion changes only the availability of one
exact content-addressed local byte copy, while Project membership and status
remain unchanged.

## Runtime contract

- `GET /api/queries/projects/:projectId/sources/:projectSourceId/local-copy-deletion`
  is an authenticated, grant-resolved preview. It binds the current Project,
  ProjectDefinition, ProjectSource, ArtifactManifest, Artifact, store, object
  key, content hash, byte size, and media type.
- The preview applies `petra-local-copy-retention-v1`. Shared storage identity,
  another ProjectSource use, downstream Artifact derivation, active Work, an
  open Review, or unavailable exact bytes blocks deletion.
- `POST /api/commands/projects/:projectId/sources/:projectSourceId/local-copy-deletion`
  accepts only the exact preview-bound request and revalidates authorization,
  identity, eligibility, and storage metadata. Actor and capability grant are
  server-owned; the registered command is `DeleteLocalSourceCopy`.
- `POST /api/queries/projects/:projectId/sources/:projectSourceId/local-copy-deletion-recovery`
  distinguishes a confirmed receipt, no observed effect, a durable pending
  storage attempt, command conflict, and a differently owned attempt.
- The renderer-neutral client validates the same Project, source, copy,
  preservation, command, and return boundaries.

## Persistence and unknown-effect safety

V056 records an exact pending attempt before calling the byte store. The S3
adapter verifies the content-addressed object's hash, size, media type, store,
and key before deletion and verifies absence afterward. A lost storage response
leaves the attempt pending; retrying the identical request reuses the same
command and idempotency identities. If the object is already absent after that
durable intent, the receipt reports
`already_absent_after_durable_intent` instead of falsely claiming the worker
observed deletion.

The immutable receipt is also the retained tombstone. It preserves the Project
link, Work and WorkVersion identity, ArtifactManifest, rights decision,
selectors, provenance, and history. It never implies Project-link removal or
historical erasure.

## Delivery status

The backend runtime owner and typed client are live. The inventory entry moves
from `missing` to `partial` because the frozen design-owned control is not yet
bound to these routes and no complete visible source-lifecycle workflow has
executed. This slice therefore claims no `UX1.6-SOURCES` evidence.

## Verification

- Focused contract, typed-client, authenticated-route, and exact byte-store
  tests pass.
- `npm run test:postgres:integration` migrates a disposable PostgreSQL 18.6
  store through V056 and passes 184 tests across 25 files, including durable
  intent, authorization denial, unknown-effect recovery, idempotent restart
  replay, physical absence, and retained authority.
- `npm run test:s3:integration` passes all 9 real S3-compatible store tests,
  including exact deletion and idempotent not-found behavior.
- `npm run verify` passes the complete repository verification gate under the
  pinned Node 24.20.0 toolchain. The first sandboxed run reached server tests
  before localhost binding was denied; the permitted rerun passed in full.
- `npm run gate:wave6:user-testable` remains correctly red with 97 incomplete
  Wave 6 operations. `source.delete-local-copy` now reports only
  `state=partial; executed evidence missing`: its production runtime owner is no
  longer a gate defect, while the design-owned control and full source workflow
  evidence remain outstanding.
